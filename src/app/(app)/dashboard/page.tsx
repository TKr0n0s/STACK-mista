'use client'

import { useState, useEffect } from 'react'
import { FastingTimer } from '@/components/fasting-timer'
import { WaterTracker } from '@/components/water-tracker'
import { TaskChecklist } from '@/components/task-checklist'
import { DailyTip } from '@/components/daily-tip'
import { DailyStreak } from '@/components/daily-streak'
import { DailyProgressRing } from '@/components/daily-progress-ring'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { Week1Data, Week1Day } from '@/lib/types'
import { initializeReminders, isNotificationsEnabled } from '@/lib/notifications'
import { sanitizeDayForFoodSafety } from '@/lib/content/day-safety'
import { getFastingRatio } from '@/lib/fasting-utils'
import { getMealImage } from '@/lib/meal-images'
import type { AIPlanJSON } from '@/lib/ai-plan-schema'

export default function DashboardPage() {
  const [day, setDay] = useState<Week1Day | null>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [currentWeek, setCurrentWeek] = useState(1)
  const [fetchError, setFetchError] = useState(false)
  const [fastingStartHour, setFastingStartHour] = useState(20)
  const [fastingEndHour, setFastingEndHour] = useState(12)

  const loadData = async () => {
    setLoading(true)
    setFetchError(false)
    try {
      // Fetch profile first
      const profileRes = await fetch('/api/user/profile')

      let programDay = 1
      let weekNumber = 1
      let foodsToAvoidRaw: string | null = null

      if (profileRes.ok) {
        const profile = await profileRes.json()
        foodsToAvoidRaw = profile.foods_to_avoid || null
        // Use program_start_date if available, fallback to created_at for migration period
        const programStartDate = profile.program_start_date || profile.created_at
        const daysSinceStart = Math.floor(
          (Date.now() - new Date(programStartDate).getTime()) / 86400000
        )
        // Calculate week number (1-indexed, caps at 4 for specific plans)
        weekNumber = Math.floor(daysSinceStart / 7) + 1
        programDay = (daysSinceStart % 7) + 1

        if (profile.name) setUserName(profile.name.split(' ')[0])
        setFastingStartHour(profile.fasting_start_hour ?? 20)
        setFastingEndHour(profile.fasting_end_hour ?? 12)

        if (isNotificationsEnabled()) {
          initializeReminders(
            profile.fasting_start_hour || 20,
            profile.fasting_end_hour || 12
          )
        }
      }

      setCurrentWeek(weekNumber)

      // Try AI plan first — if available and valid JSON, use its meals
      let usedAIPlan = false
      try {
        const planRes = await fetch('/api/generate-plan')
        if (planRes.ok) {
          const planData = await planRes.json()
          if (planData.plan_content) {
            const aiPlan: AIPlanJSON = JSON.parse(planData.plan_content)
            const aiDay = aiPlan.days?.[(programDay - 1) % aiPlan.days.length]
            if (aiDay) {
              const mappedDay: Week1Day = {
                day: programDay,
                title: aiDay.title,
                meals: {
                  breakfast: { name: aiDay.meals.breakfast.name, desc: aiDay.meals.breakfast.desc, image: getMealImage(aiDay.meals.breakfast.name, 'breakfast'), kcal: aiDay.meals.breakfast.kcal },
                  lunch: { name: aiDay.meals.lunch.name, desc: aiDay.meals.lunch.desc, image: getMealImage(aiDay.meals.lunch.name, 'lunch'), kcal: aiDay.meals.lunch.kcal },
                  dinner: { name: aiDay.meals.dinner.name, desc: aiDay.meals.dinner.desc, image: getMealImage(aiDay.meals.dinner.name, 'dinner'), kcal: aiDay.meals.dinner.kcal },
                },
                hydration: aiDay.hydration,
                exercise: aiDay.exercise,
                tip: aiDay.tip,
                did_you_know: aiDay.motivation,
                motivation: aiDay.motivation,
              }
              setDay(mappedDay)
              usedAIPlan = true
            }
          }
        }
      } catch {
        // AI plan not available or not JSON — fall through to static
      }

      // Fallback: load static week data
      if (!usedAIPlan) {
        const weekFile = weekNumber > 4 ? 'week-generic.json' : `week${weekNumber}.json`
        const weekRes = await fetch(`/data/${weekFile}`)

        if (weekRes.ok) {
          const data: Week1Data = await weekRes.json()
          const selectedDay = data.days[programDay - 1] || data.days[0]
          setDay(sanitizeDayForFoodSafety(selectedDay, foodsToAvoidRaw))
        } else {
          throw new Error('Failed to load week data')
        }
      }
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="mx-4 mt-4">
        <div className="rounded-xl bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">Erro ao carregar dados</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={loadData}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (!day) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalKcal = (day.meals.breakfast.kcal || 0) + (day.meals.lunch.kcal || 0) + (day.meals.dinner.kcal || 0)

  return (
    <div className="space-y-5 page-enter stagger-children">
      {/* Header with greeting and decorative blob */}
      <div className="relative flex items-end justify-between">
        {/* Warm decorative blob */}
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />

        <div className="relative z-10">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {currentWeek > 4 ? 'Manutenção' : `Semana ${currentWeek}`} &middot; Dia {day.day}
          </p>
          <h1 className="text-2xl font-bold text-foreground">
            {userName ? `Olá, ${userName}` : 'Meu Dia'}
          </h1>
        </div>
        {totalKcal > 0 && (
          <div className="relative z-10 text-right">
            <p className="text-lg font-bold text-primary">{totalKcal}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase">kcal hoje</p>
          </div>
        )}
      </div>

      {/* Daily progress ring + streak — side by side in grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          <DailyProgressRing />
        </div>
        <DailyStreak />
      </div>

      {/* HERO: Fasting Timer */}
      <FastingTimer
        durationMs={getFastingRatio(fastingStartHour, fastingEndHour).fasting * 3600000}
        startHour={fastingStartHour}
        endHour={fastingEndHour}
      />

      {/* Meal cards with images */}
      <TaskChecklist day={day} />

      {/* Daily tip — moved before water tracker */}
      <DailyTip
        tip={day.tip}
        didYouKnow={day.did_you_know}
        motivation={day.motivation}
      />

      {/* Water tracker with cups */}
      <WaterTracker />

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-muted-foreground/60 pb-2">
        Este app não substitui acompanhamento médico.
      </p>
    </div>
  )
}
