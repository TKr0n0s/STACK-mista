import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmailLoginForm } from '@/components/email-login-form'

export default function AtivarPage() {
  return (
    <Card>
      <CardHeader className="text-center space-y-3">
        <img src="/icons/icon-192.png" alt="Sempre Magras" className="h-16 w-16 rounded-full" />
        <CardTitle className="text-2xl text-primary">
          Bem-vinda ao Sempre Magras!
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Digite o email que você usou na compra
        </p>
      </CardHeader>
      <CardContent>
        <EmailLoginForm
          title=""
          subtitle=""
          buttonText="Ativar Minha Conta"
        />
      </CardContent>
    </Card>
  )
}
