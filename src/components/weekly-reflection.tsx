'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface WeeklyReflectionProps {
  weekNumber: number
  onSubmit: (data: ReflectionData) => Promise<void>
}

interface ReflectionData {
  energy: string
  sleep: string
  mood: string
}

const energyOptions = [
  { value: 'great', label: 'Otima' },
  { value: 'good', label: 'Boa' },
  { value: 'ok', label: 'Normal' },
  { value: 'low', label: 'Baixa' },
  { value: 'bad', label: 'Ruim' },
]

const sleepOptions = [
  { value: 'great', label: 'Otimo' },
  { value: 'good', label: 'Bom' },
  { value: 'ok', label: 'Normal' },
  { value: 'bad', label: 'Ruim' },
  { value: 'terrible', label: 'Pessimo' },
]

const moodEmojis = [
  { value: 'great', label: '😄' },
  { value: 'good', label: '🙂' },
  { value: 'ok', label: '😐' },
  { value: 'tired', label: '😴' },
  { value: 'bad', label: '😞' },
]

export function WeeklyReflection({ weekNumber, onSubmit }: WeeklyReflectionProps) {
  const [energy, setEnergy] = useState('')
  const [sleep, setSleep] = useState('')
  const [mood, setMood] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    if (!energy || !sleep || !mood) return
    setLoading(true)
    try {
      await onSubmit({ energy, sleep, mood })
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="border-secondary/30 bg-secondary/5">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-medium text-secondary">
            Reflexao da Semana {weekNumber} registrada!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <h3 className="font-semibold">
          Reflexao da Semana {weekNumber}
        </h3>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Como foi sua energia?</p>
          <div className="flex gap-1">
            {energyOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEnergy(opt.value)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs transition-colors ${
                  energy === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Como foi seu sono?</p>
          <div className="flex gap-1">
            {sleepOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSleep(opt.value)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs transition-colors ${
                  sleep === opt.value
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Seu humor geral?</p>
          <div className="flex justify-around">
            {moodEmojis.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMood(opt.value)}
                className={`h-12 w-12 rounded-full text-2xl transition-transform ${
                  mood === opt.value ? 'scale-125 ring-2 ring-primary' : ''
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!energy || !sleep || !mood || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Salvar Reflexao
        </Button>
      </CardContent>
    </Card>
  )
}
