'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '@/lib/db/schema'
import { useStore } from '@/lib/store'
import { useUserId } from '@/hooks/use-user-id'
import { enqueueSync } from '@/lib/sync/syncManager'

const FASTING_DURATION_MS = 16 * 60 * 60 * 1000 // 16 hours

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export function useTimer() {
  const { fastingState, fastingStartedAt, setFasting } = useStore()
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const userId = useUserId()

  // Rehydrate from IndexedDB on mount
  useEffect(() => {
    async function rehydrate() {
      try {
        const log = await db.fastingLogs
          .where('date')
          .equals(getToday())
          .first()

        if (log && log.startedAt && !log.endedAt) {
          setFasting('fasting', log.startedAt)
        }
      } catch {
        // IndexedDB not available
      }
    }
    rehydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update elapsed time with setInterval (1 second tick)
  useEffect(() => {
    if (fastingState !== 'fasting' || !fastingStartedAt) {
      setElapsed(0)
      return
    }

    function tick() {
      setElapsed(Date.now() - fastingStartedAt!)
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fastingState, fastingStartedAt])

  const startFasting = useCallback(async () => {
    const now = Date.now()
    setFasting('fasting', now)

    try {
      const today = getToday()
      await db.fastingLogs.add({
        userId,
        date: today,
        startedAt: now,
        endedAt: null,
        synced: false,
      })

      // Enqueue sync
      try {
        await enqueueSync('daily_progress', 'upsert', {
          date: today,
          fasting_started_at: new Date(now).toISOString(),
        })
      } catch {
        // Sync enqueue failed, but don't break UI
      }
    } catch {
      // IndexedDB write failed
    }
  }, [setFasting, userId])

  const stopFasting = useCallback(async () => {
    const startedAt = fastingStartedAt
    setFasting('idle', null)

    if (startedAt) {
      try {
        const today = getToday()
        const endedAt = Date.now()
        const log = await db.fastingLogs
          .where('date')
          .equals(today)
          .first()

        if (log?.id) {
          await db.fastingLogs.update(log.id, {
            endedAt,
            synced: false,
          })
        }

        // Enqueue sync
        try {
          await enqueueSync('daily_progress', 'upsert', {
            date: today,
            fasting_ended_at: new Date(endedAt).toISOString(),
          })
        } catch {
          // Sync enqueue failed, but don't break UI
        }
      } catch {
        // IndexedDB write failed
      }
    }
  }, [fastingStartedAt, setFasting])

  const remaining = Math.max(0, FASTING_DURATION_MS - elapsed)
  const progress = Math.min(1, elapsed / FASTING_DURATION_MS)

  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

  const elapsedHours = Math.floor(elapsed / (1000 * 60 * 60))

  return {
    fastingState,
    elapsed,
    elapsedHours,
    remaining,
    progress,
    hours,
    minutes,
    seconds,
    startFasting,
    stopFasting,
    isComplete: elapsed >= FASTING_DURATION_MS,
  }
}
