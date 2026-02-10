import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email obrigatório' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const supabase = createAdminClient()

    // Check 1: Purchase exists?
    const { data: purchase } = await supabase
      .from('purchase_activations')
      .select('id, status')
      .ilike('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Check 2: User already has profile?
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id, profile_completed')
      .ilike('email', normalizedEmail)
      .limit(1)
      .single()

    if (!purchase && !existingProfile) {
      return NextResponse.json(
        { error: 'Não encontramos uma compra com este email. Verifique e tente novamente.' },
        { status: 404 }
      )
    }

    // generateLink creates auth user if new, or generates token for existing
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (linkError || !linkData) {
      logger.error({ linkError }, 'Failed to generate link')
      return NextResponse.json(
        { error: 'Erro ao criar sessão' },
        { status: 500 }
      )
    }

    const userId = linkData.user.id

    logger.info(
      {
        hasActionLink: !!linkData.properties.action_link,
        hasHashedToken: !!linkData.properties.hashed_token,
        actionLinkLength: linkData.properties.action_link?.length,
      },
      'generateLink result'
    )

    // If new user, create profile
    // program_start_date will be set when onboarding completes
    if (!existingProfile) {
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: normalizedEmail,
          name: '',
          fasting_start_hour: 20,
          fasting_end_hour: 12,
          current_week: 1,
          profile_completed: false,
          program_start_date: null, // Will be set on onboarding completion
        })

      if (userInsertError && userInsertError.code !== '23505') {
        logger.error({ userInsertError }, 'Failed to create user record')
      }

      if (purchase) {
        await supabase
          .from('purchase_activations')
          .update({
            status: 'activated',
            activated_at: new Date().toISOString()
          })
          .eq('id', purchase.id)
      }

      logger.info({ email: normalizedEmail.slice(0, 3) + '***' }, 'New user created via email login')
    }

    // Try to get session - multiple approaches for resilience
    let sessionData: { access_token: string; refresh_token: string; expires_in: number; user: unknown } | null = null

    // Approach 1: Parse action_link to get raw token, verify via REST API
    try {
      const actionLink = new URL(linkData.properties.action_link)
      const rawToken = actionLink.searchParams.get('token')
      const tokenType = actionLink.searchParams.get('type') || 'magiclink'

      logger.info(
        { hasRawToken: !!rawToken, tokenType, tokenLength: rawToken?.length },
        'Approach 1: Parsed action_link for raw token'
      )

      if (rawToken) {
        const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`
        const res = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            type: tokenType,
            token_hash: rawToken,
          }),
        })

        if (res.ok) {
          sessionData = await res.json()
          logger.info({ hasAccessToken: !!sessionData?.access_token }, 'Approach 1 SUCCESS: raw token verify')
        } else {
          const errText = await res.text()
          logger.warn({ status: res.status, errText: errText.slice(0, 200) }, 'Approach 1 FAILED: raw token verify')
        }
      }
    } catch (e) {
      logger.warn({ err: String(e) }, 'Approach 1 error')
    }

    // Approach 2: Use hashed_token via REST API
    if (!sessionData?.access_token) {
      try {
        const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`
        const res = await fetch(verifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            type: 'magiclink',
            token_hash: linkData.properties.hashed_token,
          }),
        })

        if (res.ok) {
          sessionData = await res.json()
          logger.info({ hasAccessToken: !!sessionData?.access_token }, 'Approach 2 SUCCESS: hashed_token verify')
        } else {
          const errText = await res.text()
          logger.warn({ status: res.status, errText: errText.slice(0, 200) }, 'Approach 2 FAILED: hashed_token verify')
        }
      } catch (e) {
        logger.warn({ err: String(e) }, 'Approach 2 error')
      }
    }

    // Approach 3: Use anon Supabase client with verifyOtp SDK
    if (!sessionData?.access_token) {
      try {
        const anonClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { data: otpData, error: otpError } = await anonClient.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: 'magiclink',
        })

        if (otpError) {
          logger.warn({ otpError: otpError.message }, 'Approach 3 FAILED: SDK verifyOtp')
        } else if (otpData?.session) {
          sessionData = {
            access_token: otpData.session.access_token,
            refresh_token: otpData.session.refresh_token,
            expires_in: otpData.session.expires_in,
            user: otpData.session.user,
          }
          logger.info({ hasAccessToken: true }, 'Approach 3 SUCCESS: SDK verifyOtp')
        }
      } catch (e) {
        logger.warn({ err: String(e) }, 'Approach 3 error')
      }
    }

    // If all approaches failed, log and return error
    if (!sessionData?.access_token) {
      logger.error(
        { email: normalizedEmail.slice(0, 3) + '***' },
        'All session verification approaches failed'
      )
      return NextResponse.json(
        { error: 'Erro ao verificar sessão' },
        { status: 500 }
      )
    }

    const needsOnboarding = existingProfile ? !existingProfile.profile_completed : true

    logger.info(
      { email: normalizedEmail.slice(0, 3) + '***', needsOnboarding },
      'Email login successful'
    )

    return NextResponse.json({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
      expires_in: sessionData.expires_in,
      user: sessionData.user,
      redirect_to: needsOnboarding ? '/onboarding' : '/dashboard',
    })
  } catch (err) {
    logger.error({ err }, 'Email login error')
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
