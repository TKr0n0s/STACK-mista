'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/db/schema'
import { useUserId } from '@/hooks/use-user-id'
import { useStore } from '@/lib/store'
import { Trophy } from 'lucide-react'

const WATER_TARGET = 8

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export function DailyProgressRing() {
  const [tasksDone, setTasksDone] = useState(0)
  const { waterCups, fastingState } = useStore()
  const userId = useUserId()
  const totalTasks = 4 // breakfast, lunch, dinner, exercise

  useEffect(() => {
    async function load() {
      try {
        const today = getToday()
        const tasks = await db.taskCompletions
          .where('[userId+date+taskType]')
          .between([userId, today, ''], [userId, today, '\uffff'])
          .toArray()
        setTasksDone(tasks.filter(t => t.completed).length)
      } catch {
        // IndexedDB unavailable
      }
    }
    load()

    // Re-check periodically (30s — tasks don't change that often)
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [userId])

  // Calculate overall progress (tasks: 40%, water: 30%, fasting: 30%)
  const taskProgress = tasksDone / totalTasks
  const waterProgress = Math.min(waterCups / WATER_TARGET, 1)
  const fastingActive = fastingState === 'fasting' ? 1 : 0
  const overallProgress = taskProgress * 0.4 + waterProgress * 0.3 + fastingActive * 0.3
  const percentage = Math.round(overallProgress * 100)

  const size = 64
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const decorativeRadius = radius + 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference - overallProgress * circumference

  const isComplete = percentage >= 90

  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${isComplete ? 'glow-complete pulse-glow' : ''}`} style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Decorative ring - subtle background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={decorativeRadius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="0.5"
            opacity={0.15}
          />
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            opacity={0.4}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isComplete ? 'url(#progressComplete)' : 'url(#progressGrad)'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
          <defs>
            <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D85C7B" />
              <stop offset="100%" stopColor="#E8A87C" />
            </linearGradient>
            <linearGradient id="progressComplete" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2D5D4F" />
              <stop offset="100%" stopColor="#7FB3A0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <Trophy size={20} className="text-secondary" />
          ) : (
            <span className="text-sm font-bold tabular-nums text-foreground">{percentage}%</span>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">
          {isComplete ? 'Dia completo!' : 'Progresso do dia'}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {tasksDone}/{totalTasks} refeições &middot; {waterCups}/{WATER_TARGET} copos
        </p>
      </div>
    </div>
  )
}
