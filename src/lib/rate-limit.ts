import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

// IA endpoints: 3 req/min per user (reduced from 10 for security)
export const aiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 m'),
  prefix: 'ai',
})

// Global AI limiter: 8 req/min across all users
export const aiGlobalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(8, '1 m'),
  prefix: 'ai-global',
})

// Hotmart webhook: 30 req/min per IP
export const hotmartWebhookLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'hotmart',
})

// Data entry: 120 req/min per user (water tracker, checkboxes)
export const dataEntryLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '1 m'),
  prefix: 'data',
})

// OTP: 3 per email per hour
export const otpRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'otp',
})

// OTP verify: 5 req/min per email (prevent brute force)
export const otpVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'otp-verify',
})

// Activation status check: 10 req/min per IP (prevent enumeration)
export const activationStatusLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'activation-status',
})

// Kiwify webhook: 30 req/min per IP
export const kiwifyWebhookLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'kiwify',
})
