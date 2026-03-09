import { describe, it, expect } from 'vitest'
import { getTodayKey } from '@/lib/date-utils'

describe('getTodayKey', () => {
  it('returns YYYY-MM-DD format', () => {
    const key = getTodayKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('uses local date, not UTC', () => {
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(getTodayKey()).toBe(expected)
  })
})
