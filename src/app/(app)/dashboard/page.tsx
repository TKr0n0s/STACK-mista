'use client'

import { useState, useEffect } from 'react'
import { FastingTimer } from '@/components/fasting-timer'
import { WaterTracker } from '@/components/water-tracker'
import { TaskChecklist } from '@/components/task-checklist'
import { DailyTip } from '@/components/daily-tip'
import { DailyStreak } from '@/components/daily-streak'
import { DailyProgressRing } from '@/components/daily-progress-ring'
import { Loader2 } from 'lucide-react'
import type { Week1Data, Week1Day } from '@/lib/types'
import { initializeReminders, isNotificationsEnabled } from '@/lib/notifications'

export default function DashboardPage() {
  const [day, setDay] = useState<Week1Day | null>(null)
  const [loading, setLoading] = useState(true)
  const [dayIndex, setDayIndex] = useState(1)
  const [userName, setUserName] = useState('')

  const [currentWeek, setCurrentWeek] = useState(1)

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Fetch profile first
        const profileRes = await fetch('/api/user/profile')

        let programDay = 1
        let weekNumber = 1

        if (profileRes.ok) {
          const profile = await profileRes.json()
          const daysSinceSignup = Math.floor(
            (Date.now() - new Date(profile.created_at).getTime()) / 86400000
          )
          // Calculate week number (1-indexed, caps at 4 for specific plans)
          weekNumber = Math.floor(daysSinceSignup / 7) + 1
          programDay = (daysSinceSignup % 7) + 1

          if (profile.name) setUserName(profile.name.split(' ')[0])

          if (isNotificationsEnabled()) {
            initializeReminders(
              profile.fasting_start_hour || 20,
              profile.fasting_end_hour || 12
            )
          }
        }

        setDayIndex(programDay)
        setCurrentWeek(weekNumber)

        // Load appropriate week data (weeks 5+ use generic plan)
        const weekFile = weekNumber > 4 ? 'week-generic.json' : `week${weekNumber}.json`
        const weekRes = await fetch(`/data/${weekFile}`)

        if (weekRes.ok) {
          const data: Week1Data = await weekRes.json()
          setDay(data.days[programDay - 1] || data.days[0])
        }
      } catch {
        setDayIndex(new Date().getDay() || 7)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (loading || !day) {
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
      <FastingTimer />

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
