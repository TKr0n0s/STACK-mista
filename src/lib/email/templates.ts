/**
 * Email templates for Queima Intermitente
 * Uses brand colors: primary #D85C7B, secondary #2D5D4F, background #FFF8F0
 */

/**
 * Welcome email sent after successful OTP verification
 */
export function getWelcomeEmailHtml(name: string): string {
  const displayName = name || 'Guerreira'
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vinda ao Queima Intermitente</title>
  <style>
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #FFF8F0;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 480px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 20px rgba(216, 92, 123, 0.08);
    }
    .logo {
      text-align: center;
      font-size: 48px;
      margin-bottom: 24px;
    }
    h1 {
      color: #D85C7B;
      font-size: 24px;
      margin-bottom: 16px;
      font-weight: 700;
    }
    p {
      color: #3D3D3D;
      margin: 0 0 16px 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #D85C7B 0%, #E8A87C 100%);
      color: white !important;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      margin: 24px 0;
    }
    .features {
      background: #FFF8F0;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .features p {
      font-weight: 600;
      margin-bottom: 8px;
      color: #2D5D4F;
    }
    .features ul {
      margin: 0;
      padding-left: 20px;
      color: #3D3D3D;
    }
    .features li {
      margin: 6px 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #EDE5DB;
      font-size: 12px;
      color: #8A8A8A;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🔥</div>
    <h1>Bem-vinda, ${displayName}!</h1>
    <p>Sua conta no <strong>Queima Intermitente</strong> foi ativada com sucesso!</p>
    <p>Agora voce tem acesso completo ao programa de jejum intermitente 16:8 desenvolvido especialmente para mulheres na menopausa.</p>

    <div style="text-align: center;">
      <a href="https://queimaintermitente.com/dashboard" class="button">Acessar Meu Painel</a>
    </div>

    <div class="features">
      <p>O que voce vai encontrar:</p>
      <ul>
        <li>Plano de refeicoes personalizado</li>
        <li>Timer de jejum inteligente</li>
        <li>Acompanhamento de hidratacao</li>
        <li>Dicas diarias de bem-estar</li>
      </ul>
    </div>

    <div class="footer">
      <p>Duvidas? Responda este email ou acesse nosso suporte.</p>
      <p>&copy; Queima Intermitente</p>
    </div>
  </div>
</body>
</html>`
}

/**
 * OTP email template - 6-digit activation code
 */
export function getOtpEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codigo de Ativacao</title>
  <style>
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #FFF8F0;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 480px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 20px rgba(216, 92, 123, 0.08);
    }
    .logo {
      text-align: center;
      font-size: 48px;
      margin-bottom: 24px;
    }
    h1 {
      color: #D85C7B;
      font-size: 24px;
      margin-bottom: 16px;
      font-weight: 700;
      text-align: center;
    }
    p {
      color: #3D3D3D;
      margin: 0 0 16px 0;
      text-align: center;
    }
    .otp-code {
      background: linear-gradient(135deg, #FFF8F0 0%, #FCF0E6 100%);
      border: 2px solid #D85C7B;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }
    .otp-code span {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #D85C7B;
      font-family: monospace;
    }
    .expiry {
      color: #8A8A8A;
      font-size: 13px;
      text-align: center;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #EDE5DB;
      font-size: 12px;
      color: #8A8A8A;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🔥</div>
    <h1>Codigo de Ativacao</h1>
    <p>Use o codigo abaixo para ativar sua conta no <strong>Queima Intermitente</strong>:</p>

    <div class="otp-code">
      <span>${otp}</span>
    </div>

    <p class="expiry">Este codigo expira em <strong>10 minutos</strong>.</p>
    <p class="expiry">Se voce nao solicitou este codigo, ignore este email.</p>

    <div class="footer">
      <p>&copy; Queima Intermitente</p>
    </div>
  </div>
</body>
</html>`
}
