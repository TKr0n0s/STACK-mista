'use client'

import { BottomNav } from '@/components/bottom-nav'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { useOfflineSync } from '@/hooks/use-offline-sync'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  useOfflineSync()

  return (
    <div className="mx-auto min-h-dvh max-w-[600px] pb-28 safe-top">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        Ir para conteúdo
      </a>
      <main id="main-content" className="px-4 py-4">{children}</main>
      <BottomNav />
      <PWAInstallPrompt />
    </div>
  )
}
