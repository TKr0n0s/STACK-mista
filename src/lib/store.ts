import { create } from 'zustand'
import type { FastingState, TabId } from './types'

interface AppState {
  // Fasting timer (reactive UI state only — persistence in IndexedDB)
  fastingState: FastingState
  fastingStartedAt: number | null
  setFasting: (state: FastingState, startedAt: number | null) => void

  // Active tab
  activeTab: TabId
  setActiveTab: (tab: TabId) => void

  // Water count (reactive — synced from IndexedDB on mount)
  waterCups: number
  setWaterCups: (cups: number) => void
  incrementWater: () => void

  // Online status
  isOnline: boolean
  setIsOnline: (online: boolean) => void

  // Reset (logout)
  reset: () => void
}

const initialState = {
  fastingState: 'idle' as FastingState,
  fastingStartedAt: null as number | null,
  activeTab: 'dashboard' as TabId,
  waterCups: 0,
  isOnline: true,
}

export const useStore = create<AppState>((set) => ({
  ...initialState,

  setFasting: (fastingState, fastingStartedAt) =>
    set({ fastingState, fastingStartedAt }),

  setActiveTab: (activeTab) => set({ activeTab }),

  setWaterCups: (waterCups) => set({ waterCups }),
  incrementWater: () => set((s) => ({ waterCups: s.waterCups + 1 })),

  setIsOnline: (isOnline) => set({ isOnline }),

  reset: () => set(initialState),
}))
