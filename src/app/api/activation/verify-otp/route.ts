import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { otpVerifyLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getResend } from '@/lib/resend'
import { getWelcomeEmailHtml } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()
    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email e codigo obrigatorios' },
        { status: 400 }
      )
    }

    // Rate limit: 5 attempts per minute per email
    const { success } = await otpVerifyLimiter.limit(email)
    if (!success) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos.' },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()

    // Get latest activation for email
    const { data: activation } = await supabase
      .from('purchase_activations')
      .select('*')
      .eq('email', email)
      .eq('status', 'otp_sent')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!activation) {
      return NextResponse.json(
        { error: 'Codigo nao encontrado. Solicite um novo.' },
        { status: 404 }
      )
    }

    // Check attempts
    if (activation.otp_attempts >= 5) {
      await supabase
        .from('purchase_activations')
        .update({ status: 'failed' })
        .eq('id', activation.id)
      return NextResponse.json(
        { error: 'Muitas tentativas. Solicite um novo codigo.' },
        { status: 400 }
      )
    }

    // Check expiration
    if (new Date(activation.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Codigo expirado. Solicite um novo.' },
        { status: 400 }
      )
    }

    // Verify OTP with bcrypt
    const isValid = await bcrypt.compare(otp, activation.otp_hash)
    if (!isValid) {
      // Increment attempts AFTER verification fails (atomic optimistic locking)
      const { error: updateError } = await supabase
        .from('purchase_activations')
        .update({ otp_attempts: activation.otp_attempts + 1 })
        .eq('id', activation.id)
        .eq('otp_attempts', activation.otp_attempts)

      // If update failed due to optimistic locking (otp_attempts changed), row was already updated
      if (updateError) {
        logger.warn(
          { activationId: activation.id, updateError },
          'Optimistic lock collision on OTP attempt increment'
        )
      }

      return NextResponse.json({ error: 'Codigo incorreto' }, { status: 400 })
    }

    // Generate magic link (creates user if doesn't exist)
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
      })

    if (linkError || !linkData) {
      logger.error({ linkError }, 'Failed to generate magic link')
      return NextResponse.json({ error: 'Erro ao ativar' }, { status: 500 })
    }

    // Extract hashed_token from the link
    const hashedToken = linkData.properties.hashed_token
    const userId = linkData.user.id

    // Insert user into public.users if not already exists (A6)
    const { error: userInsertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        name: '',
        fasting_start_hour: 20,
        fasting_end_hour: 12,
        current_week: 1,
        profile_completed: false,
      })

    // Ignore 23505 (unique violation) - user already exists
    if (userInsertError && userInsertError.code !== '23505') {
      logger.error({ userInsertError, userId }, 'Failed to insert user')
      return NextResponse.json({ error: 'Erro ao ativar' }, { status: 500 })
    }

    if (userInsertError?.code === '23505') {
      logger.debug({ userId, email }, 'User already exists, skipping insert')
    }

    // Mark as activated
    await supabase
      .from('purchase_activations')
      .update({ status: 'activated', activated_at: new Date().toISOString() })
      .eq('id', activation.id)

    logger.info({ activationId: activation.id }, 'Account activated')

    // Send welcome email
    try {
      const webhookPayload = activation.webhook_payload as Record<string, unknown> | null
      const dataPayload = webhookPayload?.data as Record<string, unknown> | undefined
      const buyerPayload = dataPayload?.buyer as Record<string, unknown> | undefined
      const buyerName =
        (webhookPayload?.buyer_name as string) ||
        (buyerPayload?.name as string) ||
        ''

      await getResend().emails.send({
        from: process.env.EMAIL_FROM || 'Queima Intermitente <onboarding@resend.dev>',
        to: email,
        subject: 'Bem-vinda ao Queima Intermitente! 🔥',
        html: getWelcomeEmailHtml(buyerName),
      })
      logger.info({ email: email.slice(0, 3) + '***' }, 'Welcome email sent')
    } catch (emailErr) {
      // Don't fail activation if welcome email fails
      logger.error({ emailErr }, 'Failed to send welcome email')
    }

    // Return hashed_token — client will call verifyOtp() to create session
    return NextResponse.json({
      success: true,
      hashed_token: hashedToken,
      email,
    })
  } catch (err) {
    logger.error({ err }, 'Verify OTP error')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
