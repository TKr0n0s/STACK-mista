import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
    const admin = createAdminClient()

    // 1. Check purchase OR existing profile
    const [{ data: purchase }, { data: existingProfile }] = await Promise.all([
      admin
        .from('purchase_activations')
        .select('id, status')
        .ilike('email', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      admin
        .from('users')
        .select('id, profile_completed')
        .ilike('email', normalizedEmail)
        .limit(1)
        .single(),
    ])

    if (!purchase && !existingProfile) {
      return NextResponse.json(
        { error: 'Não encontramos uma compra com este email. Verifique e tente novamente.' },
        { status: 404 }
      )
    }

    // 2. Ensure auth user exists
    let userId: string

    const { data: userList } = await admin.auth.admin.listUsers()
    const existingAuthUser = userList?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
    )

    if (existingAuthUser) {
      userId = existingAuthUser.id
    } else {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
      })

      if (createError || !newUser.user) {
        logger.error({ createError }, 'Failed to create auth user')
        return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 })
      }
      userId = newUser.user.id
    }

    // 3. Create user profile if it doesn't exist
    if (!existingProfile) {
      const { error: insertErr } = await admin.from('users').insert({
        id: userId,
        email: normalizedEmail,
        name: '',
        fasting_start_hour: 20,
        fasting_end_hour: 12,
        current_week: 1,
        profile_completed: false,
        program_start_date: null,
      })

      if (insertErr && insertErr.code !== '23505') {
        logger.error({ insertErr }, 'Failed to create user record')
      }

      if (purchase) {
        await admin.from('purchase_activations').update({
          status: 'activated',
          activated_at: new Date().toISOString(),
        }).eq('id', purchase.id)
      }

      logger.info({ email: normalizedEmail.slice(0, 3) + '***' }, 'New user created')
    }

    // 4. Generate session via admin link (server-side only)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (linkError || !linkData) {
      logger.error({ linkError }, 'Failed to generate session link')
      return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 })
    }

    // 5. Verify token server-side to get session
    const actionLink = new URL(linkData.properties.action_link)
    const rawToken = actionLink.searchParams.get('token')

    if (!rawToken) {
      logger.error({}, 'No token in action link')
      return NextResponse.json({ error: 'Erro ao criar sessão' }, { status: 500 })
    }

    const verifyRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        body: JSON.stringify({ type: 'magiclink', token_hash: rawToken }),
      }
    )

    if (!verifyRes.ok) {
      const errText = await verifyRes.text()
      logger.error({ status: verifyRes.status, errText: errText.slice(0, 200) }, 'Token verify failed')
      return NextResponse.json({ error: 'Erro ao verificar sessão' }, { status: 500 })
    }

    const sessionData = await verifyRes.json()

    // 6. Set session via httpOnly cookies (server-side)
    const cookieStore = await cookies()
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, httpOnly: true, secure: true, sameSite: 'lax' })
            )
          },
        },
      }
    )

    await supabaseServer.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token,
    })

    const needsOnboarding = existingProfile ? !existingProfile.profile_completed : true

    logger.info({ email: normalizedEmail.slice(0, 3) + '***', needsOnboarding }, 'Login successful')

    // 7. Return ONLY redirect — no tokens in body
    return NextResponse.json({
      redirect_to: needsOnboarding ? '/onboarding' : '/dashboard',
    })
  } catch (err) {
    logger.error({ err }, 'Email login error')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
