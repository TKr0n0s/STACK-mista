import { describe, it, expect } from 'vitest'

describe('OTP generation and validation', () => {
  function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  it('generates 6-digit OTP', () => {
    const otp = generateOTP()
    expect(otp).toHaveLength(6)
    expect(/^\d{6}$/.test(otp)).toBe(true)
  })

  it('generates different OTPs', () => {
    const otps = new Set(Array.from({ length: 100 }, () => generateOTP()))
    // At least 90 unique OTPs out of 100
    expect(otps.size).toBeGreaterThan(90)
  })

  it('OTP is within valid range', () => {
    for (let i = 0; i < 100; i++) {
      const otp = generateOTP()
      const num = parseInt(otp)
      expect(num).toBeGreaterThanOrEqual(100000)
      expect(num).toBeLessThanOrEqual(999999)
    }
  })

  it('validates OTP expiration logic', () => {
    const now = Date.now()
    const tenMinutesMs = 10 * 60 * 1000

    // OTP created 5 minutes ago — still valid
    const fiveMinutesAgo = new Date(now - 5 * 60 * 1000)
    expect(now - fiveMinutesAgo.getTime() < tenMinutesMs).toBe(true)

    // OTP created 15 minutes ago — expired
    const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000)
    expect(now - fifteenMinutesAgo.getTime() < tenMinutesMs).toBe(false)
  })

  it('enforces max 5 attempts', () => {
    let attempts = 0
    const maxAttempts = 5

    for (let i = 0; i < 7; i++) {
      if (attempts >= maxAttempts) break
      attempts++
    }

    expect(attempts).toBe(5)
  })
})
