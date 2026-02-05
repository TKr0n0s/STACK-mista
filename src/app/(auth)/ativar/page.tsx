import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivationForm } from './ActivationForm'

export default function AtivarPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-primary">
          Bem-vinda ao Queima Intermitente!
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ative sua conta para comecar
        </p>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="text-center">Carregando...</div>}>
          <ActivationForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
