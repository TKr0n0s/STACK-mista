'use client'

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Flame, Droplets, Clock, CheckCircle2, Trophy } from 'lucide-react'
import { WeeklyReflection } from '@/components/weekly-reflection'
import { db } from '@/lib/db/schema'
import { useUserId } from '@/hooks/use-user-id'

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

function getWeekDates(): string[] {
  const now = new Date()
  const day = now.getDay() || 7 // Monday = 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

function StatCard({
  icon: Icon,
  value,
  label,
  iconColor,
  bgColor,
}: {
  icon: typeof Flame
  value: string | number
  label: string
  iconColor: string
  bgColor: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-4 shadow-sm" style={{
      background: `linear-gradient(135deg, hsl(var(--card)) 0%, ${bgColor}08 100%)`
    }}>
      {/* Decorative circle */}
      <div
        className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-[0.08]"
        style={{ background: bgColor }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${bgColor}20` }}
        >
          <Icon size={20} className={iconColor} />
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default function ProgressPage() {
  const userId = useUserId()
  const [stats, setStats] = useState({
    daysCompleted: 0,
    streak: 0,
    waterTotal: 0,
    fastingHours: 0,
    tasksPercent: 0,
  })
  const [weekNumber, setWeekNumber] = useState(1)
  const [daysWithActivity, setDaysWithActivity] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const isSunday = new Date().getDay() === 0
  const today = new Date().toISOString().split('T')[0]

  // Fetch user profile to get current week
  useEffect(() => {
    async function fetchUserWeek() {
      try {
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const profile = await res.json()
          setWeekNumber(profile.current_week || 1)
        }
      } catch {
        // Keep default week 1
      }
    }
    fetchUserWeek()
  }, [])

  useEffect(() => {
    if (!userId || userId === 'anonymous') return

    async function loadStats() {
      try {
        const weekDates = getWeekDates()
        const firstDate = weekDates[0]
        const lastDate = weekDates[weekDates.length - 1] + '\uffff'

        // Water total — use compound index [userId+date]
        const waterLogs = await db.waterLogs
          .where('[userId+date]')
          .between([userId, firstDate], [userId, lastDate])
          .toArray()
        const waterTotal = waterLogs.reduce((sum, l) => sum + l.cups, 0)

        // Tasks completed — use compound index [userId+date+taskType]
        const tasks = await db.taskCompletions
          .where('[userId+date+taskType]')
          .between([userId, firstDate, ''], [userId, lastDate, '\uffff'])
          .toArray()
        const completedTasks = tasks.filter((t) => t.completed).length
        const totalPossible = weekDates.length * 4
        const tasksPercent = totalPossible > 0
          ? Math.round((completedTasks / totalPossible) * 100)
          : 0

        // Fasting hours — use compound index [userId+date]
        const fastingLogs = await db.fastingLogs
          .where('[userId+date]')
          .between([userId, firstDate], [userId, lastDate])
          .toArray()
        const fastingMs = fastingLogs.reduce((sum, l) => {
          if (l.startedAt && l.endedAt) {
            return sum + (l.endedAt - l.startedAt)
          }
          return sum
        }, 0)
        const fastingHours = Math.round(fastingMs / (1000 * 60 * 60))

        // Days completed (at least 1 task done)
        const daysWithTasks = new Set(
          tasks.filter((t) => t.completed).map((t) => t.date)
        )
        const daysCompleted = daysWithTasks.size

        // Track which days have activity
        const activityDates = new Set([
          ...waterLogs.map((l) => l.date),
          ...tasks.filter((t) => t.completed).map((t) => t.date),
          ...fastingLogs.map((l) => l.date),
        ])
        setDaysWithActivity(activityDates)

        // Streak (consecutive days with activity)
        const allActivityDates = new Set([
          ...waterLogs.map((l) => l.date),
          ...tasks.filter((t) => t.completed).map((t) => t.date),
        ])

        let streak = 0
        for (let i = 0; i < 30; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().split('T')[0]
          if (allActivityDates.has(dateStr)) {
            streak++
          } else if (i === 0) {
            // Today might not have activity yet, skip
            continue
          } else {
            break
          }
        }

        setStats({
          daysCompleted,
          streak,
          waterTotal,
          fastingHours,
          tasksPercent,
        })
      } catch {
        // IndexedDB not available
      }
    }
    loadStats()
  }, [today, userId])

  const progressPercent = (stats.daysCompleted / 7) * 100
  const weekDates = getWeekDates()

  async function handleReflectionSubmit(data: {
    energy: string
    sleep: string
    mood: string
  }) {
    try {
      const res = await fetch('/api/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'weekly',
          week_number: weekNumber,
          energy: data.energy,
          sleep: data.sleep,
          mood: data.mood,
        }),
      })

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: 'Reflexao semanal salva com sucesso!',
        })
        setTimeout(() => setFeedback(null), 3000)
      } else {
        setFeedback({
          type: 'error',
          message: 'Erro ao salvar reflexao. Tente novamente.',
        })
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Erro ao salvar reflexao. Sera salva offline.',
      })
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  return (
    <div className="space-y-5 page-enter">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Seu progresso
          </p>
          <h1 className="text-xl font-bold text-foreground">Semana {weekNumber}</h1>
        </div>
        {stats.streak > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5">
            <Trophy size={14} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-600">{stats.streak} dias</span>
          </div>
        )}
      </div>

      {/* Feedback message */}
      {feedback && (
        <div
          className={`rounded-xl p-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Week day dots */}
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">Progresso da semana</span>
          <span className="text-xs font-bold text-foreground">{stats.daysCompleted}/7</span>
        </div>

        <div className="flex items-center justify-between gap-1 mb-3">
          {weekDates.map((date, i) => {
            const isToday = date === today
            const hasActivity = daysWithActivity.has(date)
            const isPast = date < today

            return (
              <div key={date} className="flex flex-col items-center gap-1.5">
                <span className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground/60'}`}>
                  {DAY_LABELS[i]}
                </span>
                <div className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                  hasActivity
                    ? 'bg-primary text-white shadow-lg shadow-primary/40'
                    : isToday
                      ? 'border-2 border-primary bg-primary/5 shadow-md shadow-primary/20'
                      : isPast
                        ? 'bg-muted/60'
                        : 'bg-muted/30'
                }`}>
                  {hasActivity ? (
                    <CheckCircle2 size={18} strokeWidth={2.5} />
                  ) : (
                    <span className={`text-[12px] font-semibold ${isToday ? 'text-primary' : 'text-muted-foreground/40'}`}>
                      {i + 1}
                    </span>
                  )}
                  {isToday && !hasActivity && (
                    <div className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="relative h-3 w-full rounded-full bg-muted/50 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full gradient-primary transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          {progressPercent > 0 && progressPercent < 100 && (
            <div
              className="absolute inset-y-0 left-0 rounded-full progress-shimmer"
              style={{ width: `${progressPercent}%` }}
            />
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 stagger-children">
        <StatCard
          icon={Flame}
          value={stats.streak}
          label="Dias seguidos"
          iconColor="text-orange-500"
          bgColor="#F97316"
        />
        <StatCard
          icon={Droplets}
          value={stats.waterTotal}
          label="Copos de agua"
          iconColor="text-blue-500"
          bgColor="#3B82F6"
        />
        <StatCard
          icon={Clock}
          value={`${stats.fastingHours}h`}
          label="Horas de jejum"
          iconColor="text-primary"
          bgColor="#D85C7B"
        />
        <StatCard
          icon={CheckCircle2}
          value={`${stats.tasksPercent}%`}
          label="Tarefas feitas"
          iconColor="text-secondary"
          bgColor="#2D5D4F"
        />
      </div>

      {/* Weekly reflection (shown on Sundays) */}
      {isSunday ? (
        <WeeklyReflection
          weekNumber={weekNumber}
          onSubmit={handleReflectionSubmit}
        />
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-muted bg-card/50 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            A reflexao semanal aparecera aqui aos domingos.
          </p>
        </div>
      )}

      {/* Motivational message */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 p-5 border border-amber-100/50 shadow-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xl">❤️</span>
          <p className="text-sm font-semibold text-amber-900">Continue assim!</p>
        </div>
        <p className="text-xs text-amber-800/70">Cada dia conta para sua transformação.</p>
      </div>
    </div>
  )
}
