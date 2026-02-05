'use client'

import { BottomNav } from '@/components/bottom-nav'
import { useOfflineSync } from '@/hooks/use-offline-sync'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useOfflineSync()

  return (
    <div className="mx-auto min-h-dvh max-w-[600px] pb-28 safe-top">
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}
