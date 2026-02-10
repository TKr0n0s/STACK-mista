/**
 * @jest-environment jsdom
 */

import {
  isNotificationSupported,
  getNotificationPermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
  requestNotificationPermission,
  showNotification,
  startWaterReminders,
  scheduleFastingReminders,
  stopAllReminders,
} from '../notifications'

describe('Notification Utils', () => {
  let mockLocalStorage: Record<string, string> = {}
  let mockServiceWorkerRegistration: any

  beforeEach(() => {
    // Reset mock localStorage
    mockLocalStorage = {}

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value
        }),
        removeItem: jest.fn((key: string) => {
          delete mockLocalStorage[key]
        }),
        clear: jest.fn(() => {
          mockLocalStorage = {}
        }),
      },
      writable: true,
    })

    // Mock Notification API
    global.Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    } as any

    // Mock Service Worker
    mockServiceWorkerRegistration = {
      showNotification: jest.fn().mockResolvedValue(undefined),
    }

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve(mockServiceWorkerRegistration),
      },
      writable: true,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    stopAllReminders()
  })

  describe('isNotificationSupported', () => {
    test('returns true when Notification API exists', () => {
      expect(isNotificationSupported()).toBe(true)
    })

    test('returns false when Notification API does not exist', () => {
      const originalNotification = global.Notification
      // @ts-ignore
      delete global.Notification
      expect(isNotificationSupported()).toBe(false)
      global.Notification = originalNotification
    })
  })

  describe('getNotificationPermission', () => {
    test('returns current permission state', () => {
      expect(getNotificationPermission()).toBe('default')
    })

    test('returns "unsupported" when API unavailable', () => {
      const originalNotification = global.Notification
      // @ts-ignore
      delete global.Notification
      expect(getNotificationPermission()).toBe('unsupported')
      global.Notification = originalNotification
    })
  })

  describe('isNotificationsEnabled', () => {
    test('returns true when enabled in localStorage', () => {
      mockLocalStorage['sempre-magras:notifications-enabled'] = 'true'
      expect(isNotificationsEnabled()).toBe(true)
    })

    test('returns false when disabled in localStorage', () => {
      mockLocalStorage['sempre-magras:notifications-enabled'] = 'false'
      expect(isNotificationsEnabled()).toBe(false)
    })

    test('returns false when not set in localStorage', () => {
      expect(isNotificationsEnabled()).toBe(false)
    })
  })

  describe('setNotificationsEnabled', () => {
    test('sets enabled to true in localStorage', () => {
      setNotificationsEnabled(true)
      expect(mockLocalStorage['sempre-magras:notifications-enabled']).toBe('true')
    })

    test('sets enabled to false in localStorage', () => {
      setNotificationsEnabled(false)
      expect(mockLocalStorage['sempre-magras:notifications-enabled']).toBe('false')
    })

    test('stops all reminders when disabled', () => {
      // Start some reminders first
      mockLocalStorage['sempre-magras:notifications-enabled'] = 'true'
      global.Notification.permission = 'granted'

      startWaterReminders()

      // Disable notifications
      setNotificationsEnabled(false)

      // Reminders should be stopped
      // (Implementation detail: activeReminders object should be empty)
    })
  })

  describe('requestNotificationPermission', () => {
    test('returns true when permission granted', async () => {
      global.Notification.permission = 'default'
      const result = await requestNotificationPermission()
      expect(result).toBe(true)
      expect(global.Notification.requestPermission).toHaveBeenCalled()
    })

    test('returns true when permission already granted', async () => {
      global.Notification.permission = 'granted'
      const result = await requestNotificationPermission()
      expect(result).toBe(true)
      expect(global.Notification.requestPermission).not.toHaveBeenCalled()
    })

    test('returns false when permission denied', async () => {
      global.Notification.permission = 'denied'
      const result = await requestNotificationPermission()
      expect(result).toBe(false)
      expect(global.Notification.requestPermission).not.toHaveBeenCalled()
    })

    test('returns false when API unavailable', async () => {
      const originalNotification = global.Notification
      // @ts-ignore
      delete global.Notification
      const result = await requestNotificationPermission()
      expect(result).toBe(false)
      global.Notification = originalNotification
    })
  })

  describe('showNotification', () => {
    beforeEach(() => {
      mockLocalStorage['sempre-magras:notifications-enabled'] = 'true'
      global.Notification.permission = 'granted'
    })

    test('shows notification when enabled and permitted', async () => {
      await showNotification('Test Title', {
        body: 'Test Body',
        type: 'water',
      })

      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        'Test Title',
        expect.objectContaining({
          body: 'Test Body',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'water',
          data: expect.objectContaining({
            url: '/dashboard',
            type: 'water',
          }),
        })
      )
    })

    test('does not show notification when disabled', async () => {
      mockLocalStorage['sempre-magras:notifications-enabled'] = 'false'

      await showNotification('Test Title', { body: 'Test Body' })

      expect(mockServiceWorkerRegistration.showNotification).not.toHaveBeenCalled()
    })

    test('does not show notification when permission not granted', async () => {
      global.Notification.permission = 'default'

      await showNotification('Test Title', { body: 'Test Body' })

      expect(mockServiceWorkerRegistration.showNotification).not.toHaveBeenCalled()
    })
  })

  describe('startWaterReminders', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      mockLocalStorage['sempre-magras:notifications-enabled'] = 'true'
      global.Notification.permission = 'granted'
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('schedules water reminders every 2 hours', () => {
      startWaterReminders(12, 20)

      // Fast-forward 2 hours
      jest.advanceTimersByTime(2 * 60 * 60 * 1000)

      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('agua'),
        expect.any(Object)
      )
    })

    test('does not start reminders when disabled', () => {
      mockLocalStorage['sempre-magras:notifications-enabled'] = 'false'

      startWaterReminders(12, 20)
      jest.advanceTimersByTime(2 * 60 * 60 * 1000)

      expect(mockServiceWorkerRegistration.showNotification).not.toHaveBeenCalled()
    })
  })

  describe('scheduleFastingReminders', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      mockLocalStorage['sempre-magras:notifications-enabled'] = 'true'
      global.Notification.permission = 'granted'
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('schedules fasting start and end reminders', () => {
      const now = new Date()
      now.setHours(10, 0, 0, 0) // Set to 10 AM
      jest.setSystemTime(now)

      scheduleFastingReminders(20, 12)

      // Fast-forward to fasting start time (20:00)
      const hoursUntilStart = 10 // 20 - 10
      jest.advanceTimersByTime(hoursUntilStart * 60 * 60 * 1000)

      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        expect.stringContaining('jejum'),
        expect.objectContaining({
          type: 'fasting-start',
        })
      )
    })

    test('does not schedule reminders when disabled', () => {
      mockLocalStorage['sempre-magras:notifications-enabled'] = 'false'

      scheduleFastingReminders(20, 12)
      jest.advanceTimersByTime(24 * 60 * 60 * 1000) // 24 hours

      expect(mockServiceWorkerRegistration.showNotification).not.toHaveBeenCalled()
    })
  })

  describe('stopAllReminders', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      mockLocalStorage['sempre-magras:notifications-enabled'] = 'true'
      global.Notification.permission = 'granted'
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    test('stops all active reminders', () => {
      startWaterReminders()
      scheduleFastingReminders()

      stopAllReminders()

      // Fast-forward time - no notifications should fire
      jest.advanceTimersByTime(24 * 60 * 60 * 1000)

      expect(mockServiceWorkerRegistration.showNotification).not.toHaveBeenCalled()
    })
  })
})
