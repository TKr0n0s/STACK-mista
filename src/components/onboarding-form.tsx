'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ConsentCheckbox } from '@/components/consent-checkbox'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentária', desc: 'Pouca ou nenhuma atividade física', icon: '🛋️' },
  { value: 'light', label: 'Leve', desc: 'Exercícios leves 1-2x por semana', icon: '🚶‍♀️' },
  { value: 'moderate', label: 'Moderado', desc: 'Exercícios 3-4x por semana', icon: '🏃‍♀️' },
  { value: 'active', label: 'Ativo', desc: 'Exercícios intensos 5+ vezes', icon: '💪' },
]

const DIETARY_RESTRICTIONS = [
  { value: 'vegetarian', label: 'Vegetariana', icon: '🥬' },
  { value: 'vegan', label: 'Vegana', icon: '🌱' },
  { value: 'lactose_free', label: 'Sem Lactose', icon: '🥛' },
  { value: 'gluten_free', label: 'Sem Glúten', icon: '🌾' },
  { value: 'low_carb', label: 'Low Carb', icon: '🥩' },
  { value: 'none', label: 'Nenhuma', icon: '✅' },
]

const PROTEIN_OPTIONS = [
  { value: 'chicken', label: 'Frango', icon: '🍗' },
  { value: 'fish', label: 'Peixe', icon: '🐟' },
  { value: 'meat', label: 'Carne Vermelha', icon: '🥩' },
  { value: 'eggs', label: 'Ovos', icon: '🥚' },
  { value: 'legumes', label: 'Leguminosas', icon: '🫘' },
]

const TOTAL_STEPS = 6

export function OnboardingForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form data
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [weight, setWeight] = useState<number | ''>('')
  const [targetWeight, setTargetWeight] = useState<number | ''>('')
  const [activityLevel, setActivityLevel] = useState('')
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([])
  const [foodsToAvoid, setFoodsToAvoid] = useState('')
  const [proteinPreference, setProteinPreference] = useState('')
  const [fastingStart, setFastingStart] = useState(20)
  const [fastingEnd, setFastingEnd] = useState(12)
  const [consent, setConsent] = useState(false)

  const fastingHours = fastingStart > fastingEnd
    ? 24 - fastingStart + fastingEnd
    : fastingEnd - fastingStart

  function formatHour(h: number) {
    return `${h.toString().padStart(2, '0')}:00`
  }

  function canProceed() {
    switch (step) {
      case 1: return name.trim().length >= 2 && age && age >= 18 && age <= 100
      case 2: return weight && weight >= 30 && weight <= 300 && targetWeight && targetWeight >= 30 && targetWeight <= 300
      case 3: return !!activityLevel
      case 4: return dietaryRestrictions.length > 0
      case 5: return !!proteinPreference
      case 6: return consent
      default: return false
    }
  }

  function nextStep() {
    if (step < TOTAL_STEPS) setStep(step + 1)
  }

  function prevStep() {
    if (step > 1) setStep(step - 1)
  }

  function toggleRestriction(value: string) {
    if (value === 'none') {
      setDietaryRestrictions(['none'])
    } else {
      setDietaryRestrictions(prev => {
        const filtered = prev.filter(r => r !== 'none')
        if (filtered.includes(value)) {
          return filtered.filter(r => r !== value)
        }
        return [...filtered, value]
      })
    }
  }

  async function handleSubmit() {
    if (!canProceed()) return
    setLoading(true)
    setError('')

    try {
      // Save profile with all fields
      const profileRes = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          age: Number(age),
          weight: Number(weight),
          target_weight: Number(targetWeight),
          activity_level: activityLevel,
          dietary_restrictions: dietaryRestrictions.filter(r => r !== 'none'),
          foods_to_avoid: foodsToAvoid.trim(),
          protein_preference: proteinPreference,
          fasting_start_hour: fastingStart,
          fasting_end_hour: fastingEnd,
          profile_completed: true,
        }),
      })

      if (!profileRes.ok) {
        const data = await profileRes.json()
        throw new Error(data.error || 'Erro ao salvar perfil')
      }

      // Register LGPD consent
      await Promise.all([
        fetch('/api/lgpd/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consent_type: 'privacy_policy', granted: true }),
        }),
        fetch('/api/lgpd/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consent_type: 'health_data', granted: true }),
        }),
      ])

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 === step
                ? 'w-8 bg-primary'
                : i + 1 < step
                  ? 'w-4 bg-primary/60'
                  : 'w-4 bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Nome e Idade */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-1">
            <p className="text-4xl">👋</p>
            <h2 className="text-xl font-semibold text-foreground">Vamos começar!</h2>
            <p className="text-sm text-muted-foreground">Me conta um pouco sobre você</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Qual seu nome?</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu primeiro nome"
                className="h-12 text-base"
                maxLength={50}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age" className="text-sm font-medium">Qual sua idade?</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 52"
                className="h-12 text-base"
                min={18}
                max={100}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Peso */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-1">
            <p className="text-4xl">⚖️</p>
            <h2 className="text-xl font-semibold text-foreground">Seus objetivos</h2>
            <p className="text-sm text-muted-foreground">Isso nos ajuda a personalizar seu plano</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-sm font-medium">Peso atual (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 75"
                className="h-12 text-base"
                min={30}
                max={300}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetWeight" className="text-sm font-medium">Peso desejado (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 65"
                className="h-12 text-base"
                min={30}
                max={300}
              />
            </div>

            {weight && targetWeight && (
              <p className="text-center text-sm text-muted-foreground">
                Meta: perder <span className="font-semibold text-primary">{Math.max(0, Number(weight) - Number(targetWeight))}kg</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Nivel de Atividade */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-1">
            <p className="text-4xl">🏃‍♀️</p>
            <h2 className="text-xl font-semibold text-foreground">Nível de atividade</h2>
            <p className="text-sm text-muted-foreground">Como é sua rotina de exercícios?</p>
          </div>

          <div className="space-y-3">
            {ACTIVITY_LEVELS.map((level) => (
              <Card
                key={level.value}
                className={`cursor-pointer transition-all duration-200 ${
                  activityLevel === level.value
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'hover:border-primary/30'
                }`}
                onClick={() => setActivityLevel(level.value)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="text-2xl">{level.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium">{level.label}</p>
                    <p className="text-xs text-muted-foreground">{level.desc}</p>
                  </div>
                  {activityLevel === level.value && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Restricoes Alimentares */}
      {step === 4 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-1">
            <p className="text-4xl">🥗</p>
            <h2 className="text-xl font-semibold text-foreground">Restrições alimentares</h2>
            <p className="text-sm text-muted-foreground">Selecione todas que se aplicam</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {DIETARY_RESTRICTIONS.map((restriction) => (
              <Card
                key={restriction.value}
                className={`cursor-pointer transition-all duration-200 ${
                  dietaryRestrictions.includes(restriction.value)
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'hover:border-primary/30'
                }`}
                onClick={() => toggleRestriction(restriction.value)}
              >
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <span className="text-2xl">{restriction.icon}</span>
                  <p className="text-sm font-medium">{restriction.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="foodsToAvoid" className="text-sm font-medium">
              Alimentos que você NÃO come (opcional)
            </Label>
            <Input
              id="foodsToAvoid"
              value={foodsToAvoid}
              onChange={(e) => setFoodsToAvoid(e.target.value)}
              placeholder="Ex: amendoim, frutos do mar, pimenta..."
              className="h-12 text-base"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Alergias, intolerâncias ou alimentos que não gosta
            </p>
          </div>
        </div>
      )}

      {/* Step 5: Proteina Preferida */}
      {step === 5 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-1">
            <p className="text-4xl">🍗</p>
            <h2 className="text-xl font-semibold text-foreground">Proteína preferida</h2>
            <p className="text-sm text-muted-foreground">Qual você mais gosta?</p>
          </div>

          <div className="space-y-3">
            {PROTEIN_OPTIONS.map((protein) => (
              <Card
                key={protein.value}
                className={`cursor-pointer transition-all duration-200 ${
                  proteinPreference === protein.value
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'hover:border-primary/30'
                }`}
                onClick={() => setProteinPreference(protein.value)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="text-2xl">{protein.icon}</span>
                  <p className="font-medium flex-1">{protein.label}</p>
                  {proteinPreference === protein.value && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Horario de Jejum + Consentimento */}
      {step === 6 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="text-center space-y-1">
            <p className="text-4xl">⏰</p>
            <h2 className="text-xl font-semibold text-foreground">Horário de jejum</h2>
            <p className="text-sm text-muted-foreground">Quando prefere jejuar?</p>
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Início do jejum</p>
                  <p className="text-2xl font-bold text-primary">{formatHour(fastingStart)}</p>
                </div>
                <div className="text-muted-foreground">→</div>
                <div>
                  <p className="text-xs text-muted-foreground">Fim do jejum</p>
                  <p className="text-2xl font-bold text-secondary">{formatHour(fastingEnd)}</p>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Jejum de <span className="font-semibold text-foreground">{fastingHours}h</span>
                {' '} / Janela alimentar de{' '}
                <span className="font-semibold text-foreground">{24 - fastingHours}h</span>
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="fasting-start" className="text-xs text-muted-foreground">
                    Início: {formatHour(fastingStart)}
                  </label>
                  <input
                    id="fasting-start"
                    type="range"
                    min={0}
                    max={23}
                    value={fastingStart}
                    onChange={(e) => setFastingStart(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="fasting-end" className="text-xs text-muted-foreground">
                    Fim: {formatHour(fastingEnd)}
                  </label>
                  <input
                    id="fasting-end"
                    type="range"
                    min={0}
                    max={23}
                    value={fastingEnd}
                    onChange={(e) => setFastingEnd(Number(e.target.value))}
                    className="w-full accent-secondary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <ConsentCheckbox
            checked={consent}
            onCheckedChange={setConsent}
            disabled={loading}
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={prevStep}
            disabled={loading}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        )}

        {step < TOTAL_STEPS ? (
          <Button
            type="button"
            size="lg"
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1"
          >
            Continuar
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={handleSubmit}
            disabled={!canProceed() || loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Começar!
                <Check className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Este app é educacional e não substitui acompanhamento médico.
      </p>
    </div>
  )
}
