'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface ProfilingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

const activityLevels = [
  { value: 'sedentary', label: 'Sedentária' },
  { value: 'light', label: 'Leve' },
  { value: 'moderate', label: 'Moderada' },
  { value: 'active', label: 'Ativa' },
] as const

const proteinOptions = [
  { value: 'chicken', label: 'Frango' },
  { value: 'fish', label: 'Peixe' },
  { value: 'meat', label: 'Carne' },
  { value: 'eggs', label: 'Ovos' },
  { value: 'legumes', label: 'Leguminosas' },
] as const

const dietaryOptions = [
  'vegetariana',
  'sem lactose',
  'sem glúten',
  'vegana',
]

export function ProfilingModal({
  open,
  onOpenChange,
  onComplete,
}: ProfilingModalProps) {
  const [age, setAge] = useState('')
  const [weight, setWeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [activityLevel, setActivityLevel] = useState('')
  const [proteinPref, setProteinPref] = useState('')
  const [foodsToAvoid, setFoodsToAvoid] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleDietary(item: string) {
    setDietaryRestrictions((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: age ? Number(age) : undefined,
          weight: weight ? Number(weight) : undefined,
          target_weight: targetWeight ? Number(targetWeight) : undefined,
          activity_level: activityLevel || undefined,
          protein_preference: proteinPref || undefined,
          foods_to_avoid: foodsToAvoid || undefined,
          dietary_restrictions:
            dietaryRestrictions.length > 0 ? dietaryRestrictions : undefined,
          profile_completed: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      onComplete()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete seu perfil</DialogTitle>
          <DialogDescription>
            Com esses dados, nossa IA cria um plano personalizado para você.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                type="number"
                inputMode="numeric"
                min={18}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="55"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="weight">Peso atual (kg)</Label>
              <Input
                id="weight"
                type="number"
                inputMode="decimal"
                min={30}
                max={300}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="target-weight">Peso desejado (kg)</Label>
            <Input
              id="target-weight"
              type="number"
              inputMode="decimal"
              min={30}
              max={300}
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder="65"
            />
          </div>

          <div className="space-y-2">
            <Label>Nível de atividade</Label>
            <div className="flex flex-wrap gap-2">
              {activityLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setActivityLevel(level.value)}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    activityLevel === level.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Restrições alimentares</Label>
            <div className="flex flex-wrap gap-2">
              {dietaryOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleDietary(item)}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    dietaryRestrictions.includes(item)
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="foods-to-avoid">O que você NÃO come?</Label>
            <Input
              id="foods-to-avoid"
              type="text"
              value={foodsToAvoid}
              onChange={(e) => setFoodsToAvoid(e.target.value)}
              placeholder="Ex: camarão, amendoim, pimenta"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Proteína preferida</Label>
            <div className="flex flex-wrap gap-2">
              {proteinOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProteinPref(opt.value)}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    proteinPref === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar e Gerar Plano'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
