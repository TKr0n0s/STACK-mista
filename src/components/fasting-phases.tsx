interface FastingPhasesProps {
  elapsedHours: number
}

const phases = [
  {
    min: 0,
    max: 4,
    label: 'Digerindo',
    tip: 'Beba agua',
    color: 'text-amber-600',
  },
  {
    min: 4,
    max: 8,
    label: 'Pausa digestiva',
    tip: 'Evite exercicios intensos',
    color: 'text-orange-500',
  },
  {
    min: 8,
    max: 12,
    label: 'Queimando reservas',
    tip: 'Voce pode sentir mais foco',
    color: 'text-primary',
  },
  {
    min: 12,
    max: 16,
    label: 'Jejum ativo',
    tip: 'Quase na hora de comer!',
    color: 'text-secondary',
  },
]

export function FastingPhases({ elapsedHours }: FastingPhasesProps) {
  const phase = phases.find(
    (p) => elapsedHours >= p.min && elapsedHours < p.max
  ) || phases[phases.length - 1]

  return (
    <div className="mt-2 text-center">
      <p className={`text-[11px] font-semibold ${phase.color}`}>{phase.label}</p>
      <p className="text-[10px] text-muted-foreground">{phase.tip}</p>
    </div>
  )
}
