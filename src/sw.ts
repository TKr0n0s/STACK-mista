/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import {
  Serwist,
  CacheFirst,
  StaleWhileRevalidate,
  NetworkFirst,
  NetworkOnly,
  ExpirationPlugin,
} from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// IMPORTANT: Service Worker setTimeout timers are UNRELIABLE.
// The browser may terminate the SW at any time when idle.
// These timers are "best-effort" — the primary notification mechanism
// is the client-side timers in src/lib/notifications.ts.
// For reliable notifications when browser is closed, we would need
// server-side Push API, which is not yet implemented.
let fastingHalfwayTimer: ReturnType<typeof setTimeout> | null = null
let fastingCompleteTimer: ReturnType<typeof setTimeout> | null = null

const APP_PAGES = ['/dashboard', '/plan', '/progress', '/settings', '/onboarding']

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/data/'),
      handler: new CacheFirst({
        cacheName: 'week-data',
        plugins: [new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 3600 })],
      }),
    },
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/meals/'),
      handler: new CacheFirst({
        cacheName: 'meal-images',
        plugins: [new ExpirationPlugin({ maxEntries: 100 })],
      }),
    },
    {
      // Páginas autenticadas (app + /day/:id): NetworkFirst para garantir verificação de auth
      matcher: ({ url }: { url: URL }) =>
        APP_PAGES.includes(url.pathname) || /^\/day\/\d+$/.test(url.pathname),
      handler: new NetworkFirst({
        cacheName: 'app-pages',
        plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 * 5 })], // 5 min
      }),
    },
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/api/generate'),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.startsWith('/api/webhook') ||
        url.pathname.startsWith('/api/activation'),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url, request }: { url: URL; request: Request }) =>
        url.pathname.startsWith('/api') && request.method === 'GET',
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url, request }: { url: URL; request: Request }) =>
        url.pathname.startsWith('/api') &&
        ['POST', 'PUT', 'DELETE'].includes(request.method),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }: { request: Request }) => request.destination === 'document',
      },
    ],
  },
})

// Limpar caches antigos na ativação do SW (instalação/atualização do PWA)
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((names) => {
      // Limpar caches de páginas autenticadas para forçar verificação
      const toDelete = names.filter(
        (n) => n.includes('app-pages') || n.includes('user-data')
      )
      return Promise.all(toDelete.map((n) => caches.delete(n)))
    })
  )
})

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'LOGOUT') {
    caches.keys().then((names) => {
      const toDelete = names.filter(
        (n) =>
          n.includes('app-pages') ||
          n.includes('user-data')
      )
      return Promise.all(toDelete.map((n) => caches.delete(n)))
    })
  }

  // Fasting session notifications (best-effort background)
  if (event.data?.type === 'SCHEDULE_FASTING') {
    const { startedAt, durationMs } = event.data
    const now = Date.now()
    const elapsed = now - startedAt
    const halfwayDelay = (durationMs / 2) - elapsed
    const completeDelay = durationMs - elapsed

    if (fastingHalfwayTimer) clearTimeout(fastingHalfwayTimer)
    if (fastingCompleteTimer) clearTimeout(fastingCompleteTimer)

    if (halfwayDelay > 0) {
      fastingHalfwayTimer = setTimeout(() => {
        self.registration.showNotification('Metade do jejum! 💪', {
          body: 'Voce ja passou da metade. Continue firme!',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'fasting-halfway',
          data: { url: '/dashboard', type: 'fasting-halfway' },
        })
        fastingHalfwayTimer = null
      }, halfwayDelay)
    }

    if (completeDelay > 0) {
      fastingCompleteTimer = setTimeout(() => {
        self.registration.showNotification('Jejum completo! 🎉', {
          body: 'Parabens! Voce completou seu jejum. Hora de se alimentar!',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'fasting-complete',
          data: { url: '/dashboard', type: 'fasting-complete' },
        })
        fastingCompleteTimer = null
      }, completeDelay)
    }
  }

  if (event.data?.type === 'CANCEL_FASTING') {
    if (fastingHalfwayTimer) { clearTimeout(fastingHalfwayTimer); fastingHalfwayTimer = null }
    if (fastingCompleteTimer) { clearTimeout(fastingCompleteTimer); fastingCompleteTimer = null }
  }
})

// Handle notification clicks — navigate to the app
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return (client as WindowClient).focus()
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})

serwist.addEventListeners()
