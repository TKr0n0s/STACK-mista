'use client'

const WATER_REMINDER_KEY = 'sempre-magras:water-reminder'
const FASTING_REMINDER_KEY = 'sempre-magras:fasting-reminder'
const NOTIFICATION_PREF_KEY = 'sempre-magras:notifications-enabled'
const FASTING_HALFWAY_KEY = 'sempre-magras:fasting-halfway'
const FASTING_COMPLETE_KEY = 'sempre-magras:fasting-complete'
const FASTING_WATER_KEY = 'sempre-magras:fasting-water'

function getScheduleLockKey(userId: string) {
  return `sempre-magras:fasting-schedule-lock:${userId}`
}

export type NotificationType = 'water' | 'fasting-start' | 'fasting-end' | 'motivation' | 'fasting-halfway' | 'fasting-complete'

interface ScheduledReminder {
  timerId: ReturnType<typeof setTimeout> | null
}

const activeReminders: Record<string, ScheduledReminder> = {}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export function isNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(NOTIFICATION_PREF_KEY) === 'true'
}

export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(NOTIFICATION_PREF_KEY, enabled ? 'true' : 'false')
  if (!enabled) {
    stopAllReminders()
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function showNotification(
  title: string,
  options?: NotificationOptions & { type?: NotificationType }
): Promise<void> {
  if (!isNotificationsEnabled()) return
  if (Notification.permission !== 'granted') return

  const reg = await navigator.serviceWorker?.ready
  if (reg) {
    const notifOptions: NotificationOptions & Record<string, unknown> = {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: options?.type || 'general',
      ...options,
      data: { url: '/dashboard', type: options?.type, ...options?.data },
    }
    reg.showNotification(title, notifOptions)
  }
}

// Water reminders every 2 hours during eating window
export function startWaterReminders(
  fastingEndHour: number = 12,
  fastingStartHour: number = 20
): void {
  stopReminder(WATER_REMINDER_KEY)

  if (!isNotificationsEnabled()) return

  const INTERVAL_MS = 2 * 60 * 60 * 1000 // 2 hours

  function scheduleNext() {
    const now = new Date()
    const currentHour = now.getHours()

    // Only remind during eating window
    const inEatingWindow = fastingStartHour > fastingEndHour
      ? currentHour >= fastingEndHour && currentHour < fastingStartHour
      : currentHour >= fastingEndHour || currentHour < fastingStartHour

    if (inEatingWindow) {
      showNotification('Hora de beber agua! 💧', {
        body: 'Mantenha-se hidratada. Beba um copo de agua agora.',
        type: 'water',
        data: { url: '/dashboard' },
      })
    }

    // Schedule next check
    activeReminders[WATER_REMINDER_KEY] = {
      timerId: setTimeout(scheduleNext, INTERVAL_MS),
    }
  }

  // First reminder after 2 hours
  activeReminders[WATER_REMINDER_KEY] = {
    timerId: setTimeout(scheduleNext, INTERVAL_MS),
  }
}

// Fasting start/end reminders
export function scheduleFastingReminders(
  fastingStartHour: number = 20,
  fastingEndHour: number = 12
): void {
  stopReminder(FASTING_REMINDER_KEY)
  stopReminder(FASTING_REMINDER_KEY + '-end')

  if (!isNotificationsEnabled()) return

  function getNextOccurrence(targetHour: number): number {
    const now = new Date()
    const target = new Date()
    target.setHours(targetHour, 0, 0, 0)
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1)
    }
    return target.getTime() - now.getTime()
  }

  function scheduleStart() {
    const delay = getNextOccurrence(fastingStartHour)
    activeReminders[FASTING_REMINDER_KEY] = {
      timerId: setTimeout(() => {
        showNotification('Inicio do jejum 🌙', {
          body: `Sao ${fastingStartHour}h — sua janela de jejum comecou. Voce consegue!`,
          type: 'fasting-start',
          data: { url: '/dashboard' },
        })
        // Reschedule for tomorrow
        scheduleStart()
      }, delay),
    }
  }

  function scheduleEnd() {
    const delay = getNextOccurrence(fastingEndHour)
    activeReminders[FASTING_REMINDER_KEY + '-end'] = {
      timerId: setTimeout(() => {
        showNotification('Fim do jejum! 🎉', {
          body: `Sao ${fastingEndHour}h — voce completou o jejum! Hora de comer.`,
          type: 'fasting-end',
          data: { url: '/dashboard' },
        })
        // Reschedule for tomorrow
        scheduleEnd()
      }, delay),
    }
  }

  scheduleStart()
  scheduleEnd()
}

function stopReminder(key: string): void {
  const reminder = activeReminders[key]
  if (reminder?.timerId) {
    clearTimeout(reminder.timerId)
  }
  delete activeReminders[key]
}

export function stopAllReminders(): void {
  Object.keys(activeReminders).forEach(stopReminder)
  cancelFastingScheduleInSW()
  // Clean schedule locks for all users on this device
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key?.startsWith('sempre-magras:fasting-schedule-lock:')) {
      localStorage.removeItem(key)
    }
  }
}

// Initialize all reminders (call from dashboard on mount)
export function initializeReminders(
  fastingStartHour: number = 20,
  fastingEndHour: number = 12
): void {
  if (!isNotificationsEnabled()) return
  if (Notification.permission !== 'granted') return

  startWaterReminders(fastingEndHour, fastingStartHour)
  scheduleFastingReminders(fastingStartHour, fastingEndHour)
}

// --- Fasting session notifications (Fase 9) ---

export function scheduleFastingSessionNotifications(
  startedAt: number,
  durationMs: number,
  fastingEndHour: number,
  fastingStartHour: number,
  userId: string
): void {
  if (!isNotificationsEnabled()) return
  if (Notification.permission !== 'granted') return

  // Cross-tab idempotency via localStorage (per-user + TTL)
  const lockKey = getScheduleLockKey(userId)
  const lockData = localStorage.getItem(lockKey)
  if (lockData) {
    try {
      const parsed = JSON.parse(lockData)
      if (parsed.startedAt === startedAt && Date.now() < parsed.expiresAt) return
    } catch { /* corrupted lock, proceed */ }
  }

  // Write lock only when actually scheduling (perm ok + enabled)
  localStorage.setItem(lockKey, JSON.stringify({
    startedAt,
    expiresAt: Date.now() + durationMs + 3600000, // TTL = duration + 1h
  }))

  // Stop general water reminders — fasting water takes over (Hardening #1)
  stopReminder(WATER_REMINDER_KEY)

  // Clear any previous fasting session timers
  stopReminder(FASTING_HALFWAY_KEY)
  stopReminder(FASTING_COMPLETE_KEY)
  stopReminder(FASTING_WATER_KEY)

  const elapsed = Date.now() - startedAt
  const halfwayDelay = (durationMs / 2) - elapsed
  const completeDelay = durationMs - elapsed

  // Schedule halfway notification
  if (halfwayDelay > 0) {
    activeReminders[FASTING_HALFWAY_KEY] = {
      timerId: setTimeout(() => {
        showNotification('Metade do jejum! 💪', {
          body: 'Voce ja passou da metade. Continue firme!',
          type: 'fasting-halfway',
          tag: 'fasting-halfway',
          data: { url: '/dashboard' },
        })
        delete activeReminders[FASTING_HALFWAY_KEY]
      }, halfwayDelay),
    }
  }

  // Schedule complete notification
  if (completeDelay > 0) {
    activeReminders[FASTING_COMPLETE_KEY] = {
      timerId: setTimeout(() => {
        showNotification('Jejum completo! 🎉', {
          body: 'Parabens! Voce completou seu jejum. Hora de se alimentar!',
          type: 'fasting-complete',
          tag: 'fasting-complete',
          data: { url: '/dashboard' },
        })
        delete activeReminders[FASTING_COMPLETE_KEY]
      }, completeDelay),
    }
  }

  // Schedule water reminders every 2h during fasting
  scheduleFastingWaterReminders(startedAt, durationMs)

  // Best-effort SW backup
  postFastingScheduleToSW(startedAt, durationMs)
}

export function cancelFastingSessionNotifications(
  fastingEndHour: number,
  fastingStartHour: number,
  userId: string
): void {
  localStorage.removeItem(getScheduleLockKey(userId))
  stopReminder(FASTING_HALFWAY_KEY)
  stopReminder(FASTING_COMPLETE_KEY)
  stopReminder(FASTING_WATER_KEY)
  cancelFastingScheduleInSW()
  // Restore general water reminders (Hardening #1)
  startWaterReminders(fastingEndHour, fastingStartHour)
}

function scheduleFastingWaterReminders(startedAt: number, durationMs: number): void {
  stopReminder(FASTING_WATER_KEY)

  const INTERVAL_MS = 2 * 60 * 60 * 1000 // 2h

  function scheduleNext() {
    const elapsed = Date.now() - startedAt
    if (elapsed >= durationMs) return // Fasting ended

    activeReminders[FASTING_WATER_KEY] = {
      timerId: setTimeout(() => {
        const currentElapsed = Date.now() - startedAt
        if (currentElapsed < durationMs) {
          showNotification('Beba agua! 💧', {
            body: 'Mesmo em jejum, manter-se hidratada e essencial.',
            type: 'water',
            tag: 'fasting-water',
            data: { url: '/dashboard' },
          })
          scheduleNext()
        }
      }, INTERVAL_MS),
    }
  }

  scheduleNext()
}

function postFastingScheduleToSW(startedAt: number, durationMs: number): void {
  if (!navigator.serviceWorker?.controller) return
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({
      type: 'SCHEDULE_FASTING',
      startedAt,
      durationMs,
    })
  }).catch(() => { /* SW not available */ })
}

function cancelFastingScheduleInSW(): void {
  if (!navigator.serviceWorker?.controller) return
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({ type: 'CANCEL_FASTING' })
  }).catch(() => { /* SW not available */ })
}
