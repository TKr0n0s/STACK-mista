'use client'

import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { processSyncQueue, initSyncListeners } from '@/lib/sync/syncManager'

export function useOfflineSync() {
  const { setIsOnline } = useStore()

  useEffect(() => {
    // Set initial online state
    setIsOnline(navigator.onLine)

    // Listen for online/offline changes
    function handleOnline() {
      setIsOnline(true)
    }
    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Init sync listeners (online + visibilitychange)
    initSyncListeners()

    // Process any pending sync items on mount
    if (navigator.onLine) {
      processSyncQueue().catch(() => {})
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setIsOnline])
}
