'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    // Don't show if already installed or dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedAt = new Date(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) return
    }

    // For Android/Chrome - listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // For iOS - show manual instructions after a delay
    if (ios && !standalone) {
      setTimeout(() => setShowPrompt(true), 3000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    }
  }

  function handleDismiss() {
    setShowPrompt(false)
    localStorage.setItem('pwa-prompt-dismissed', new Date().toISOString())
  }

  if (!showPrompt || isStandalone) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="rounded-2xl bg-card shadow-lg border border-border p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-muted"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Download size={24} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Instalar o App
            </h3>
            {isIOS ? (
              <p className="text-xs text-muted-foreground mt-1">
                Toque em{' '}
                <span className="inline-flex items-center">
                  <svg className="h-4 w-4 inline" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L12 14M12 2L8 6M12 2L16 6M4 14L4 20L20 20L20 14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>{' '}
                e depois &quot;Adicionar à Tela de Início&quot;
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Adicione à sua tela inicial para acesso rápido offline
              </p>
            )}
          </div>
        </div>

        {!isIOS && deferredPrompt && (
          <Button
            onClick={handleInstall}
            size="sm"
            className="w-full mt-3 rounded-xl"
          >
            <Download size={16} className="mr-2" />
            Instalar Agora
          </Button>
        )}
      </div>
    </div>
  )
}
