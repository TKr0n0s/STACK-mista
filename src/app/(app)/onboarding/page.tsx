import { OnboardingForm } from '@/components/onboarding-form'

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-[400px] space-y-6 py-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-primary">
          Bem-vinda ao Queima Intermitente!
        </h1>
        <p className="text-muted-foreground">
          Vamos configurar seu jejum em 30 segundos.
        </p>
      </div>

      <OnboardingForm />
    </div>
  )
}
