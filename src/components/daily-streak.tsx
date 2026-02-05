'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/db/schema'
import { useUserId } from '@/hooks/use-user-id'
import { Flame, Star } from 'lucide-react'

export function DailyStreak() {
  const [streak, setStreak] = useState(0)
  const [todayDone, setTodayDone] = useState(false)
  const userId = useUserId()

  useEffect(() => {
    async function calculateStreak() {
      try {
        const logs = await db.fastingLogs
          .where('[userId+date]')
          .between([userId, ''], [userId, '\uffff'])
          .reverse()
          .sortBy('date')

        if (!logs.length) {
          setStreak(0)
          return
        }

        const today = new Date().toISOString().split('T')[0]
        let count = 0
        const checkDate = new Date()

        // Check if today has a completed fast
        const todayLog = logs.find(l => l.date === today && l.endedAt)
        if (todayLog) {
          setTodayDone(true)
          count = 1
          checkDate.setDate(checkDate.getDate() - 1)
        } else {
          // Allow today to not be done yet — check from yesterday
          const todayStarted = logs.find(l => l.date === today && l.startedAt)
          if (todayStarted) setTodayDone(false)
          checkDate.setDate(checkDate.getDate() - 1)
        }

        // Count consecutive past days
        for (let i = 0; i < 365; i++) {
          const dateStr = checkDate.toISOString().split('T')[0]
          const dayLog = logs.find(l => l.date === dateStr && l.endedAt)
          if (dayLog) {
            count++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }

        setStreak(count)
      } catch {
        // IndexedDB not available
      }
    }

    calculateStreak()
  }, [userId])

  const milestones = [3, 7, 14, 21, 30]
  const nextMilestone = milestones.find(m => m > streak) ?? streak + 7
  const progress = Math.min((streak / nextMilestone) * 100, 100)

  return (
    <div className="relative overflow-hidden rounded-2xl bg-card shadow-sm">
      {/* Decorative warm glow */}
      {streak > 0 && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, rgba(240, 201, 135, ${Math.min(streak * 0.02, 0.12)}) 0%, transparent 60%)`,
          }}
        />
      )}

      <div className="relative p-4">
        <div className="flex items-center gap-3">
          {/* Streak flame */}
          <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl ${streak > 0 ? 'bg-amber-50' : 'bg-muted'}`}>
            {streak > 0 ? (
              <div className="flame-anim">
                <Flame size={24} className="text-amber-500 fill-amber-400" />
              </div>
            ) : (
              <Flame size={24} className="text-muted-foreground/30" />
            )}
            {streak >= 7 && (
              <div className="absolute -top-1 -right-1">
                <Star size={12} className="text-amber-400 fill-amber-400 star-twinkle" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground tabular-nums">{streak}</span>
              <span className="text-xs font-medium text-muted-foreground">
                {streak === 1 ? 'dia de sequencia' : 'dias de sequencia'}
              </span>
            </div>

            {/* Progress to next milestone */}
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700 ease-out xp-fill-anim"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-amber-600 tabular-nums">
                {streak}/{nextMilestone}
              </span>
            </div>
          </div>

          {/* Today status */}
          <div className={`flex h-8 items-center rounded-full px-2.5 text-[11px] font-semibold ${
            todayDone
              ? 'bg-secondary/10 text-secondary'
              : 'bg-muted text-muted-foreground'
          }`}>
            {todayDone ? 'Hoje OK' : 'Em andamento'}
          </div>
        </div>

        {/* Milestone badges */}
        {streak > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {milestones.map((m) => (
              <div
                key={m}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold transition-all ${
                  streak >= m
                    ? 'bg-amber-100 text-amber-700 badge-pop'
                    : 'bg-muted/60 text-muted-foreground/40'
                }`}
              >
                {m}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
