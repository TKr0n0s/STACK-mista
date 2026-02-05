'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MealImage } from '@/components/meal-image'
import { ArrowLeft, Droplets, Dumbbell, Flame, Lightbulb, ChevronDown } from 'lucide-react'
import type { Week1Data, Week1Day } from '@/lib/types'

export default function DayDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dayNumber = Number(params.id)
  const [day, setDay] = useState<Week1Day | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  useEffect(() => {
    async function loadDay() {
      try {
        // Get user's current week
        const profileRes = await fetch('/api/user/profile')
        let weekNumber = 1

        if (profileRes.ok) {
          const profile = await profileRes.json()
          const daysSinceSignup = Math.floor(
            (Date.now() - new Date(profile.created_at).getTime()) / 86400000
          )
          weekNumber = Math.floor(daysSinceSignup / 7) + 1
        }

        // Load appropriate week data (weeks 5+ use generic plan)
        const weekFile = weekNumber > 4 ? 'week-generic.json' : `week${weekNumber}.json`
        const res = await fetch(`/data/${weekFile}`)
        const data: Week1Data = await res.json()
        const found = data.days.find((d) => d.day === dayNumber)
        setDay(found || null)
      } catch {
        // offline fallback
      } finally {
        setLoading(false)
      }
    }
    loadDay()
  }, [dayNumber])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!day) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft size={18} className="mr-2" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Dia não encontrado.</p>
      </div>
    )
  }

  const meals = [
    { key: 'breakfast', label: 'Café da Manhã', meal: day.meals.breakfast },
    { key: 'lunch', label: 'Almoço', meal: day.meals.lunch },
    { key: 'dinner', label: 'Jantar', meal: day.meals.dinner },
  ]

  const totalKcal = meals.reduce((sum, m) => sum + (m.meal.kcal || 0), 0)

  return (
    <div className="space-y-4 page-enter stagger-children">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10 rounded-xl"
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Dia {day.day}</h1>
          <p className="text-xs text-muted-foreground">{day.title}</p>
        </div>
        {totalKcal > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
            <Flame size={14} className="text-primary" />
            <span className="text-xs font-bold text-primary">{totalKcal} kcal</span>
          </div>
        )}
      </div>

      {/* Meal cards — compact, expandable */}
      {meals.map(({ key, label, meal }) => {
        const isExpanded = expandedMeal === key
        return (
          <div
            key={key}
            className="rounded-2xl bg-card shadow-sm overflow-hidden card-lift"
          >
            {/* Meal header — always visible */}
            <button
              onClick={() => setExpandedMeal(isExpanded ? null : key)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                <MealImage
                  src={`/meals/${meal.image}`}
                  alt={meal.name}
                  fill
                  className="object-cover"
                  sizes="168px"
                  mealType={key}
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {label}
                </span>
                <p className="text-sm font-semibold text-foreground truncate">
                  {meal.name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {meal.kcal && (
                  <span className="text-xs font-semibold text-primary">{meal.kcal} kcal</span>
                )}
                <ChevronDown
                  size={16}
                  className={`text-muted-foreground/50 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-border/50 page-enter">
                {/* Large meal image */}
                <div className="relative h-36">
                  <MealImage
                    src={`/meals/${meal.image}`}
                    alt={meal.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 600px) 100vw, 600px"
                    mealType={key}
                  />
                </div>
                {/* Description */}
                <div className="px-4 py-3">
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {meal.desc}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Wellness section — grouped hydration + exercise */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
        <div className="p-4 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Bem-estar
          </h3>

          {/* Hydration */}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <Droplets size={16} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Hidratação</p>
              <p className="text-[13px] text-muted-foreground">
                {day.hydration.water} de água + {day.hydration.tea}
              </p>
              <p className="mt-1 text-xs text-blue-500/80">{day.hydration.tip}</p>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Exercise */}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
              <Dumbbell size={16} className="text-secondary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{day.exercise.name}</p>
              <p className="text-[13px] text-muted-foreground">{day.exercise.desc}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights section — tip, did you know, motivation in one card */}
      <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className="text-amber-500" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Insights do Dia
            </h3>
          </div>

          {/* Tip */}
          <div>
            <p className="text-[11px] font-semibold text-primary/70 uppercase tracking-wide mb-0.5">
              Dica
            </p>
            <p className="text-sm leading-relaxed text-foreground">{day.tip}</p>
          </div>

          {/* Did you know */}
          {day.did_you_know && (
            <>
              <div className="h-px bg-border/50" />
              <div>
                <p className="text-[11px] font-semibold text-secondary/70 uppercase tracking-wide mb-0.5">
                  Você sabia?
                </p>
                <p className="text-sm leading-relaxed text-foreground">{day.did_you_know}</p>
              </div>
            </>
          )}

          {/* Motivation */}
          {day.motivation && (
            <>
              <div className="h-px bg-border/50" />
              <div className="relative rounded-xl bg-primary/5 p-3 pl-4 overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] gradient-primary rounded-full" />
                <p className="text-sm leading-relaxed font-medium text-foreground italic">
                  &ldquo;{day.motivation}&rdquo;
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
