'use client'

import { useEffect, useCallback, useState, memo } from 'react'
import { useStore } from '@/lib/store'
import { db } from '@/lib/db/schema'
import { useUserId } from '@/hooks/use-user-id'
import { enqueueSync } from '@/lib/sync/syncManager'
import { Celebration } from '@/components/celebration'
import { Droplets, Plus } from 'lucide-react'

const WATER_TARGET = 8

function getToday() {
  return new Date().toISOString().split('T')[0]
}

const WaterDrop = memo(function WaterDrop({
  filled,
  index,
  onClick
}: {
  filled: boolean
  index: number
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded-full"
      aria-label={filled ? `Copo ${index + 1} cheio` : `Marcar copo ${index + 1}`}
    >
      <svg
        width="38"
        height="46"
        viewBox="0 0 34 42"
        fill="none"
        className="transition-transform duration-200"
      >
        {/* Drop shape */}
        <path
          d="M17 3C17 3 4 18 4 26C4 33.18 9.82 39 17 39C24.18 39 30 33.18 30 26C30 18 17 3 17 3Z"
          fill={filled ? 'url(#dropFill)' : '#EDE5DB'}
          stroke={filled ? '#3B82F6' : '#D6CFC5'}
          strokeWidth="1.2"
          className="transition-colors duration-300"
        />
        {filled && (
          <>
            {/* Water shine highlight */}
            <ellipse cx="12" cy="22" rx="3.5" ry="5" fill="white" opacity="0.25" />
            {/* Water wave inside */}
            <path
              d="M7 28C9 26 12 27 17 26C22 25 25 27 27 28C27 33 22.5 37 17 37C11.5 37 7 33 7 28Z"
              fill="#2563EB"
              opacity="0.15"
              className="water-fill-anim"
            />
          </>
        )}
        <defs>
          <linearGradient id="dropFill" x1="17" y1="3" x2="17" y2="39" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="60%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
      </svg>
      {/* Index label */}
      <span className={`absolute bottom-1.5 text-[9px] font-bold ${filled ? 'text-white' : 'text-muted-foreground/40'}`}>
        {index + 1}
      </span>
    </button>
  )
})

export function WaterTracker() {
  const { waterCups, setWaterCups } = useStore()
  const userId = useUserId()
  const [showCelebration, setShowCelebration] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const log = await db.waterLogs
          .where('date')
          .equals(getToday())
          .first()
        if (log) setWaterCups(log.cups)
      } catch {
        // IndexedDB not available
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setWaterToLevel = useCallback(async (level: number) => {
    // Only allow increasing water (can't "unfill" a cup)
    if (level <= waterCups) return

    setWaterCups(level)

    // Trigger visual feedback
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 600)

    // Celebration when target reached
    if (level === WATER_TARGET) {
      setShowCelebration(true)
    }

    try {
      const today = getToday()
      const existing = await db.waterLogs
        .where('date')
        .equals(today)
        .first()

      if (existing?.id) {
        await db.waterLogs.update(existing.id, {
          cups: level,
          synced: false,
        })
      } else {
        await db.waterLogs.add({
          userId,
          date: today,
          cups: level,
          synced: false,
        })
      }

      try {
        await enqueueSync('daily_progress', 'upsert', {
          date: today,
          water_cups: level,
        })
      } catch {
        // Sync enqueue failed
      }
    } catch {
      // IndexedDB write failed
    }
  }, [waterCups, setWaterCups, userId])

  const addWater = useCallback(async () => {
    const newCups = waterCups + 1
    setWaterCups(newCups)

    // Trigger visual feedback
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 600)

    // Celebration when target reached
    if (newCups === WATER_TARGET) {
      setShowCelebration(true)
    }

    try {
      const today = getToday()
      const existing = await db.waterLogs
        .where('date')
        .equals(today)
        .first()

      if (existing?.id) {
        await db.waterLogs.update(existing.id, {
          cups: newCups,
          synced: false,
        })
      } else {
        await db.waterLogs.add({
          userId,
          date: today,
          cups: newCups,
          synced: false,
        })
      }

      try {
        await enqueueSync('daily_progress', 'upsert', {
          date: today,
          water_cups: newCups,
        })
      } catch {
        // Sync enqueue failed
      }
    } catch {
      // IndexedDB write failed
    }
  }, [waterCups, setWaterCups, userId])

  const reachedTarget = waterCups >= WATER_TARGET
  const mlConsumed = waterCups * 250
  const progressPercent = Math.min((waterCups / WATER_TARGET) * 100, 100)

  return (
    <>
    <Celebration
      show={showCelebration}
      message="Meta de água atingida!"
      emoji="💧"
      onDone={() => setShowCelebration(false)}
    />
    <div className={`relative overflow-hidden rounded-2xl bg-card shadow-sm ${justAdded ? 'glow-complete' : ''}`}>
      {/* Decorative background */}
      <div
        className="absolute inset-0"
        style={{
          background: reachedTarget
            ? 'radial-gradient(ellipse at 50% 80%, rgba(59,130,246,0.08) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 50% 80%, rgba(59,130,246,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Droplets size={16} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Hidratação</h3>
              <p className="text-[11px] text-muted-foreground">
                {mlConsumed}ml de 2L
              </p>
            </div>
          </div>
          {reachedTarget && (
            <span className="text-[11px] font-semibold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full">
              Meta atingida!
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 w-full rounded-full bg-blue-100/50 mb-4 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
          {progressPercent > 0 && progressPercent < 100 && (
            <div
              className="absolute inset-y-0 left-0 rounded-full progress-shimmer-wave"
              style={{ width: `${progressPercent}%` }}
            />
          )}
        </div>

        {/* Drops grid */}
        <div className="flex items-center justify-between gap-0.5 stagger-children">
          {Array.from({ length: WATER_TARGET }).map((_, i) => (
            <WaterDrop
              key={i}
              filled={i < waterCups}
              index={i}
              onClick={() => setWaterToLevel(i + 1)}
            />
          ))}
        </div>

        {/* Add water button */}
        {!reachedTarget && (
          <button
            onClick={addWater}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-400 to-blue-500 py-3 min-h-[48px] text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-blue-300/50 active:scale-[0.98]"
          >
            <span>💧</span>
            Beber água ({waterCups}/{WATER_TARGET})
          </button>
        )}
      </div>
    </div>
    </>
  )
}
