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
      return NextResponse.json(
        { error: 'Conta ja ativada. Faca login.' },
        { status: 400 }
      )
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
