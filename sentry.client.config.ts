import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend(event) {
    // LGPD: remove PII
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    event.breadcrumbs = event.breadcrumbs?.map((b) => {
      if (b.data && ('weight' in b.data || 'foods_to_avoid' in b.data)) {
        b.data = { redacted: true }
      }
      return b
    })
    return event
  },
})
