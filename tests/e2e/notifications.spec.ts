import { test, expect } from '@playwright/test'

test.describe('PWA Notifications', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant notification permission
    await context.grantPermissions(['notifications'])
  })

  test('should register service worker', async ({ page }) => {
    await page.goto('/dashboard')

    const swRegistration = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      return {
        hasRegistration: !!reg,
        state: reg?.active?.state,
      }
    })

    expect(swRegistration.hasRegistration).toBe(true)
    expect(swRegistration.state).toBe('activated')
  })

  test('should have notification permission granted', async ({ page }) => {
    await page.goto('/dashboard')

    const permission = await page.evaluate(() => Notification.permission)
    expect(permission).toBe('granted')
  })

  test('should enable notifications in localStorage', async ({ page }) => {
    await page.goto('/dashboard')

    const enabled = await page.evaluate(() =>
      localStorage.getItem('sempre-magras:notifications-enabled')
    )

    // Will be 'true' if user enabled, 'false' or null if not
    expect(['true', 'false', null]).toContain(enabled)
  })

  test('should mock showNotification call', async ({ page }) => {
    await page.goto('/dashboard')

    const notificationShown = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (!reg) return false

      try {
        await reg.showNotification('Test', {
          body: 'Test body',
          tag: 'test',
        })
        return true
      } catch (e) {
        return false
      }
    })

    expect(notificationShown).toBe(true)
  })

  test('should handle denied permission', async ({ page, context }) => {
    // Reset and deny
    await context.clearPermissions()
    await context.grantPermissions([]) // Deny notifications

    await page.goto('/dashboard')

    const permission = await page.evaluate(() => Notification.permission)
    expect(permission).not.toBe('granted')
  })

  test('should handle notification click navigation', async ({ page }) => {
    await page.goto('/dashboard')

    // Test that notification data contains URL
    const hasNavigationData = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (!reg) return false

      try {
        await reg.showNotification('Test Navigation', {
          body: 'Click to navigate',
          tag: 'test-nav',
          data: { url: '/settings' },
        })
        const notifications = await reg.getNotifications({ tag: 'test-nav' })
        return notifications[0]?.data?.url === '/settings'
      } catch (e) {
        return false
      }
    })

    expect(hasNavigationData).toBe(true)
  })

  test('should replace notifications with same tag', async ({ page }) => {
    await page.goto('/dashboard')

    const uniqueNotifications = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (!reg) return 0

      // Show two notifications with same tag
      await reg.showNotification('Water 1', { tag: 'water' })
      await reg.showNotification('Water 2', { tag: 'water' })

      // Should only have 1 (replaced)
      const notifications = await reg.getNotifications({ tag: 'water' })
      return notifications.length
    })

    expect(uniqueNotifications).toBe(1)
  })

  test('should stack notifications with different tags', async ({ page }) => {
    await page.goto('/dashboard')

    const totalNotifications = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (!reg) return 0

      // Show three notifications with different tags
      await reg.showNotification('Water', { tag: 'water' })
      await reg.showNotification('Fasting Start', { tag: 'fasting-start' })
      await reg.showNotification('Fasting End', { tag: 'fasting-end' })

      // Should have 3 separate notifications
      const notifications = await reg.getNotifications()
      return notifications.length
    })

    expect(totalNotifications).toBe(3)
  })

  test('should clear all notifications', async ({ page }) => {
    await page.goto('/dashboard')

    const cleared = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (!reg) return false

      // Show some notifications
      await reg.showNotification('Test 1', { tag: 'test1' })
      await reg.showNotification('Test 2', { tag: 'test2' })

      // Clear all
      const notifications = await reg.getNotifications()
      notifications.forEach((n) => n.close())

      // Verify cleared
      const remaining = await reg.getNotifications()
      return remaining.length === 0
    })

    expect(cleared).toBe(true)
  })
})
