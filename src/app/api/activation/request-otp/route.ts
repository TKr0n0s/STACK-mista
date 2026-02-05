import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { otpRateLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

let _resend: Resend | null = null
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not configured')
    }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email obrigatorio' }, { status: 400 })
    }

    // Rate limit: 3 OTPs per email per hour
    const { success } = await otpRateLimiter.limit(email)
    if (!success) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde 1 hora.' },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()

    // Check if purchase exists (removed .neq('status', 'failed'))
    const { data: activation } = await supabase
      .from('purchase_activations')
      .select('id, status, otp_expires_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!activation) {
      return NextResponse.json(
        { error: 'Compra nao encontrada para este email' },
        { status: 404 }
      )
    }

    if (activation.status === 'activated') {
      // User already activated but may need a new login link
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sempremagras.online'

      // Generate a new magic link with redirect
      const { data: linkData, error: linkError } =
        await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo: `${appUrl}/dashboard`,
          },
        })

      if (linkError || !linkData) {
        logger.error({ linkError }, 'Failed to generate magic link for activated user')
        return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
      }

      // Use the action_link directly from Supabase
      const actionLink = linkData.properties.action_link

      const emailFrom = process.env.EMAIL_FROM || 'Queima Intermitente <onboarding@resend.dev>'
      const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FFF8F0; padding: 20px; margin: 0; }
      .container { background: #fff; border-radius: 16px; padding: 40px; max-width: 480px; margin: 0 auto; }
      .logo { text-align: center; font-size: 48px; margin-bottom: 16px; }
      h1 { color: #D85C7B; text-align: center; margin: 0 0 24px 0; }
      .button-container { text-align: center; margin: 32px 0; }
      .button { display: inline-block; background: linear-gradient(135deg, #D85C7B, #E8A87C); color: white !important; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">🔥</div>
      <h1>Acesse sua conta</h1>
      <p style="text-align: center; color: #3D3D3D;">Clique no botão abaixo para entrar no Queima Intermitente:</p>
      <div class="button-container">
        <a href="${actionLink}" class="button">Entrar no App</a>
      </div>
      <p style="font-size: 12px; color: #666; text-align: center;">Link válido por 1 hora. Se você não solicitou, ignore este email.</p>
    </div>
  </body>
</html>`

      const emailResult = await getResend().emails.send({
        from: emailFrom,
        to: email,
        subject: 'Acesse sua conta - Queima Intermitente',
        html: htmlContent,
      })

      if (emailResult.error) {
        logger.error({ resendError: emailResult.error }, 'Failed to send magic link')
        return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 })
      }

      logger.info({ email: email.slice(0, 3) + '***' }, 'Magic link sent to activated user')
      return NextResponse.json({ success: true, loginLink: true })
    }

    // Handle lockout recovery (A7)
    if (activation.status === 'failed') {
      const lastOtpExpiry = new Date(activation.otp_expires_at || 0)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      if (lastOtpExpiry < oneHourAgo) {
        // Recovery: reset attempts and status
        await supabase
          .from('purchase_activations')
          .update({
            otp_attempts: 0,
            status: 'pending',
          })
          .eq('id', activation.id)
        logger.info({ activationId: activation.id }, 'OTP lockout reset after 1 hour')
      } else {
        // Still locked out
        const minutesRemaining = Math.ceil(
          (lastOtpExpiry.getTime() - oneHourAgo.getTime()) / 60000
        )
        return NextResponse.json(
          {
            error: `Muitas tentativas. Tente novamente em ${minutesRemaining} minuto(s).`,
          },
          { status: 429 }
        )
      }
    }

    // Generate and hash OTP with bcrypt
    const otp = generateOTP()
    const otpHash = await bcrypt.hash(otp, 10)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    await supabase
      .from('purchase_activations')
      .update({
        otp_hash: otpHash,
        otp_expires_at: expiresAt,
        otp_attempts: 0,
        status: 'otp_sent',
      })
      .eq('id', activation.id)

    // Send OTP via Resend
    const emailFrom = process.env.EMAIL_FROM || 'Queima Intermitente <onboarding@resend.dev>'

    const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        background-color: #f4f4f4;
        padding: 20px;
      }
      .container {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 40px;
        max-width: 600px;
        margin: 0 auto;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .header h1 {
        color: #333333;
        margin: 0;
        font-size: 28px;
      }
      .otp-section {
        text-align: center;
        margin: 30px 0;
      }
      .otp-code {
        background-color: #f0f0f0;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 4px;
        color: #333333;
        font-family: 'Courier New', monospace;
      }
      .expiration {
        color: #666666;
        font-size: 14px;
        margin-top: 15px;
      }
      .footer {
        text-align: center;
        margin-top: 30px;
        font-size: 12px;
        color: #999999;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Codigo de Ativacao</h1>
      </div>
      <p style="color: #666666; font-size: 16px; line-height: 1.6;">
        Seu codigo de ativacao para Queima Intermitente:
      </p>
      <div class="otp-section">
        <div class="otp-code">${otp}</div>
        <div class="expiration">Codigo valido por 10 minutos</div>
      </div>
      <p style="color: #666666; font-size: 14px; line-height: 1.6;">
        Se voce nao solicitou este codigo, ignore este email.
      </p>
      <div class="footer">
        <p>Queima Intermitente - Programa de Jejum Intermitente para Mulheres na Menopausa</p>
      </div>
    </div>
  </body>
</html>
    `

    const emailResult = await getResend().emails.send({
      from: emailFrom,
      to: email,
      subject: 'Seu codigo de ativacao - Queima Intermitente',
      html: htmlContent,
    })

    if (emailResult.error) {
      logger.error(
        { activationId: activation.id, resendError: emailResult.error },
        'Failed to send OTP via Resend'
      )
      return NextResponse.json(
        { error: 'Erro ao enviar codigo. Tente novamente.' },
        { status: 500 }
      )
    }

    // Log only last 2 digits in production, full OTP in development
    if (process.env.NODE_ENV === 'development') {
      logger.info({ activationId: activation.id, otp }, 'OTP sent via Resend (dev)')
    } else {
      const otpLastDigits = otp.slice(-2)
      logger.info(
        { activationId: activation.id, otpLastDigits },
        'OTP sent via Resend'
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, 'Request OTP error')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
