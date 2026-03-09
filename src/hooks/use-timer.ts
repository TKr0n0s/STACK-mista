'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '@/lib/db/schema'
import { useStore } from '@/lib/store'
import { useUserId } from '@/hooks/use-user-id'
import { enqueueSync } from '@/lib/sync/syncManager'
import { scheduleFastingSessionNotifications, cancelFastingSessionNotifications } from '@/lib/notifications'

const DEFAULT_FASTING_DURATION_MS = 16 * 60 * 60 * 1000 // 16 hours

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export function useTimer(durationMs?: number, fastingEndHour?: number, fastingStartHour?: number) {
  const fastingDuration = (durationMs && durationMs > 0) ? durationMs : DEFAULT_FASTING_DURATION_MS
  const endHour = fastingEndHour ?? 12
  const startHour = fastingStartHour ?? 20
  const { fastingState, fastingStartedAt, setFasting } = useStore()
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { userId, isLoading: userIdLoading } = useUserId()

  // Rehydrate from IndexedDB on mount (Hardening #4 + #5 + #5b)
  useEffect(() => {
    if (userIdLoading || userId === 'anonymous') return
    async function rehydrate() {
      try {
        // Find last OPEN log for this user (cross-midnight safe)
        const logs = await db.fastingLogs
          .where('userId')
          .equals(userId)
          .toArray()

        const openLog = logs
          .filter(l => l.startedAt && !l.endedAt)
          .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0]

        if (!openLog) return

        const elapsed = Date.now() - openLog.startedAt!

        // Auto-close if fasting already completed while app was closed
        if (elapsed >= fastingDuration) {
          if (openLog.id) {
            const estimatedEnd = openLog.startedAt! + fastingDuration
            await db.fastingLogs.update(openLog.id, {
              endedAt: estimatedEnd,
              synced: false,
            })
            try {
              await enqueueSync('daily_progress', 'upsert', {
                date: openLog.date,
                fasting_ended_at: new Date(estimatedEnd).toISOString(),
              })
            } catch { /* sync best-effort */ }
          }
          // Set state as complete to trigger celebration
          setFasting('fasting', openLog.startedAt!)
          return
        }

        // Fasting still in progress — resume
        setFasting('fasting', openLog.startedAt!)
        scheduleFastingSessionNotifications(
          openLog.startedAt!, fastingDuration, endHour, startHour, userId
        )
      } catch {
        // IndexedDB not available
      }
    }
    rehydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userIdLoading])

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
    scheduleFastingSessionNotifications(now, fastingDuration, endHour, startHour, userId)

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
  }, [setFasting, userId, fastingDuration, endHour, startHour])

  const stopFasting = useCallback(async () => {
    const startedAt = fastingStartedAt
    setFasting('idle', null)
    cancelFastingSessionNotifications(endHour, startHour, userId)

    if (startedAt) {
      try {
        // Find the open log for this user (cross-midnight safe)
        const logs = await db.fastingLogs
          .where('userId')
          .equals(userId)
          .toArray()
        const openLog = logs
          .filter(l => l.startedAt && !l.endedAt)
          .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0]

        const endedAt = Date.now()
        if (openLog?.id) {
          await db.fastingLogs.update(openLog.id, {
            endedAt,
            synced: false,
          })
        }

        // Enqueue sync
        try {
          await enqueueSync('daily_progress', 'upsert', {
            date: openLog?.date || getToday(),
            fasting_ended_at: new Date(endedAt).toISOString(),
          })
        } catch {
          // Sync enqueue failed, but don't break UI
        }
      } catch {
        // IndexedDB write failed
      }
    }
  }, [fastingStartedAt, setFasting, endHour, startHour, userId])

  const remaining = Math.max(0, fastingDuration - elapsed)
  const progress = fastingDuration > 0 ? Math.min(1, elapsed / fastingDuration) : 0

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
    isComplete: elapsed >= fastingDuration,
  }
}
