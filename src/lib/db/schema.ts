import Dexie, { type Table } from 'dexie'

export interface FastingLog {
  id?: number
  userId: string
  date: string // YYYY-MM-DD
  startedAt: number // timestamp
  endedAt: number | null
  synced: boolean
}

export interface WaterLog {
  id?: number
  userId: string
  date: string
  cups: number
  synced: boolean
}

export interface TaskCompletion {
  id?: number
  userId: string
  date: string
  taskType: 'breakfast' | 'lunch' | 'dinner' | 'exercise'
  completed: boolean
  synced: boolean
}

export interface SyncQueueItem {
  id?: number
  table: string
  operation: 'upsert' | 'update'
  payload: Record<string, unknown>
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  retryCount: number
  createdAt: number
}

export interface UserProfileCache {
  userId: string
  data: Record<string, unknown>
  updatedAt: number
}

class AppDatabase extends Dexie {
  fastingLogs!: Table<FastingLog>
  waterLogs!: Table<WaterLog>
  taskCompletions!: Table<TaskCompletion>
  syncQueue!: Table<SyncQueueItem>
  userProfile!: Table<UserProfileCache>

  constructor() {
    super('queima-intermitente')
    this.version(1).stores({
      fastingLogs: '++id, date, [userId+date]',
      waterLogs: '++id, date, [userId+date]',
      taskCompletions: '++id, [userId+date+taskType]',
      syncQueue: '++id, status, createdAt',
      userProfile: 'userId',
    })
  }
}

export const db = new AppDatabase()
