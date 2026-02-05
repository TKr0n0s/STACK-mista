'use client'

const WATER_REMINDER_KEY = 'queima:water-reminder'
const FASTING_REMINDER_KEY = 'queima:fasting-reminder'
const NOTIFICATION_PREF_KEY = 'queima:notifications-enabled'

export type NotificationType = 'water' | 'fasting-start' | 'fasting-end' | 'motivation'

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
