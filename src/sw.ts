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
      matcher: ({ url }: { url: URL }) => APP_PAGES.includes(url.pathname),
      handler: new StaleWhileRevalidate({ cacheName: 'app-pages' }),
    },
    {
      matcher: ({ url }: { url: URL }) => /^\/day\/\d+$/.test(url.pathname),
      handler: new StaleWhileRevalidate({ cacheName: 'app-pages' }),
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
