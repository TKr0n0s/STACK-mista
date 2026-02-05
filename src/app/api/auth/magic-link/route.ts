import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { otpRateLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getResend } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
    }

    // Rate limit: 3 requests per email per hour
    const { success } = await otpRateLimiter.limit(`magic:${email}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde 1 hora.' },
        { status: 429 }
      )
    }

    const supabase = createAdminClient()

    // Check if user exists in auth.users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      logger.error({ listError }, 'Failed to list users')
      return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }

    const userExists = users.users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (!userExists) {
      // User doesn't exist - suggest activation
      return NextResponse.json(
        { error: 'Email não encontrado. Você precisa ativar sua conta primeiro.' },
        { status: 404 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sempremagras.online'

    // Generate magic link with redirect
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${appUrl}/dashboard`,
        },
      })

    if (linkError || !linkData) {
      logger.error({ linkError }, 'Failed to generate magic link')
      return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
    }

    // Use the action_link directly - it contains everything needed
    // But replace the Supabase URL with our callback for better control
    const actionLink = linkData.properties.action_link

    // Send email
    const emailFrom = process.env.EMAIL_FROM || 'Queima Intermitente <onboarding@resend.dev>'
    const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FFF8F0; padding: 20px; margin: 0; }
      .container { background: #fff; border-radius: 16px; padding: 40px; max-width: 480px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
      .logo { text-align: center; font-size: 48px; margin-bottom: 16px; }
      h1 { color: #D85C7B; text-align: center; margin: 0 0 24px 0; font-size: 24px; }
      p { color: #3D3D3D; line-height: 1.6; margin: 16px 0; }
      .button-container { text-align: center; margin: 32px 0; }
      .button { display: inline-block; background: linear-gradient(135deg, #D85C7B, #E8A87C); color: white !important; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; }
      .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #EDE5DB; font-size: 12px; color: #8A8A8A; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo">🔥</div>
      <h1>Acesse sua conta</h1>
      <p>Clique no botão abaixo para entrar no <strong>Queima Intermitente</strong>:</p>
      <div class="button-container">
        <a href="${actionLink}" class="button">Entrar no App</a>
      </div>
      <p style="font-size: 14px; color: #666;">Este link é válido por 1 hora. Se você não solicitou este acesso, ignore este email.</p>
      <div class="footer">
        <p>Queima Intermitente - Jejum Intermitente para Mulheres na Menopausa</p>
      </div>
    </div>
  </body>
</html>`

    const emailResult = await getResend().emails.send({
      from: emailFrom,
      to: email,
      subject: 'Seu link de acesso - Queima Intermitente',
      html: htmlContent,
    })

    if (emailResult.error) {
      logger.error({ resendError: emailResult.error }, 'Failed to send magic link email')
      return NextResponse.json({ error: 'Erro ao enviar email' }, { status: 500 })
    }

    logger.info({ email: email.slice(0, 3) + '***' }, 'Magic link sent for login')
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, 'Magic link request error')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
