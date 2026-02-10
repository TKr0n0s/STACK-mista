'use client'

import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-4xl">📊</div>
      <h2 className="text-lg font-semibold">Erro ao carregar o dashboard</h2>
      <p className="text-sm text-muted-foreground">
        Não conseguimos carregar seus dados. Por favor, tente novamente.
      </p>
      <Button onClick={reset} size="lg">
        Tentar novamente
      </Button>
    </div>
  )
}
