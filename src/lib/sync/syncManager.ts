import { db, type SyncQueueItem } from '@/lib/db/schema'

const MAX_RETRIES = 5
let syncInProgress = false

async function cleanupOldFailedItems() {
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const oldFailed = await db.syncQueue
      .where('status')
      .equals('failed')
      .filter((item) => item.createdAt < sevenDaysAgo)
      .toArray()

    for (const item of oldFailed) {
      await db.syncQueue.delete(item.id!)
    }
  } catch (err) {
    console.error('Cleanup of old failed items failed:', err)
  }
}

export async function processSyncQueue() {
  if (syncInProgress) return
  syncInProgress = true

  try {
    const pending = await db.syncQueue
      .where('status')
      .equals('pending')
      .sortBy('createdAt')

    for (const item of pending) {
      if (item.retryCount >= MAX_RETRIES) {
        await db.syncQueue.update(item.id!, { status: 'failed' })
        continue
      }

      await db.syncQueue.update(item.id!, { status: 'syncing' })

      try {
        const response = await fetch('/api/progress/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        })

        if (response.ok) {
          // Delete successful items instead of keeping them
          await db.syncQueue.delete(item.id!)
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch {
        await db.syncQueue.update(item.id!, {
          status: 'pending',
          retryCount: item.retryCount + 1,
        })
      }
    }
  } finally {
    syncInProgress = false
  }
}

export async function enqueueSync(
  table: string,
  operation: 'upsert' | 'update',
  payload: Record<string, unknown>
) {
  const item: SyncQueueItem = {
    table,
    operation,
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  }
  await db.syncQueue.add(item)

  if (navigator.onLine) {
    processSyncQueue().catch(() => {})
  }
}

export function initSyncListeners() {
  window.addEventListener('online', () => {
    processSyncQueue().catch(() => {})
  })

  // iOS doesn't fire 'online' reliably
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      processSyncQueue().catch(() => {})
    }
  })

  // Run cleanup on init and periodically
  cleanupOldFailedItems().catch(() => {})
  setInterval(() => {
    cleanupOldFailedItems().catch(() => {})
  }, 60 * 60 * 1000) // Every hour
}
