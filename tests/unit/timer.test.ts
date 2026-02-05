import { describe, it, expect } from 'vitest'

const FASTING_DURATION_MS = 16 * 60 * 60 * 1000

describe('Timer calculations', () => {
  it('calculates remaining time correctly at start', () => {
    const startedAt = Date.now()
    const elapsed = Date.now() - startedAt
    const remaining = Math.max(0, FASTING_DURATION_MS - elapsed)

    expect(remaining).toBeGreaterThan(FASTING_DURATION_MS - 1000)
    expect(remaining).toBeLessThanOrEqual(FASTING_DURATION_MS)
  })

  it('calculates remaining time after 4 hours', () => {
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000
    const elapsed = Date.now() - fourHoursAgo
    const remaining = Math.max(0, FASTING_DURATION_MS - elapsed)

    const twelveHoursMs = 12 * 60 * 60 * 1000
    expect(remaining).toBeLessThan(twelveHoursMs + 1000)
    expect(remaining).toBeGreaterThan(twelveHoursMs - 1000)
  })

  it('shows 0 remaining after 16+ hours', () => {
    const seventeenHoursAgo = Date.now() - 17 * 60 * 60 * 1000
    const elapsed = Date.now() - seventeenHoursAgo
    const remaining = Math.max(0, FASTING_DURATION_MS - elapsed)

    expect(remaining).toBe(0)
  })

  it('calculates progress correctly', () => {
    const eightHoursAgo = Date.now() - 8 * 60 * 60 * 1000
    const elapsed = Date.now() - eightHoursAgo
    const progress = Math.min(1, elapsed / FASTING_DURATION_MS)

    expect(progress).toBeCloseTo(0.5, 1)
  })

  it('clamps progress to 1.0', () => {
    const twentyHoursAgo = Date.now() - 20 * 60 * 60 * 1000
    const elapsed = Date.now() - twentyHoursAgo
    const progress = Math.min(1, elapsed / FASTING_DURATION_MS)

    expect(progress).toBe(1)
  })

  it('calculates hours/minutes/seconds from remaining', () => {
    const remaining = 5 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

    expect(hours).toBe(5)
    expect(minutes).toBe(30)
    expect(seconds).toBe(45)
  })

  it('determines fasting phase based on elapsed hours', () => {
    const phases = [
      { min: 0, max: 4, label: 'digesting' },
      { min: 4, max: 8, label: 'pause' },
      { min: 8, max: 12, label: 'stored_energy' },
      { min: 12, max: 16, label: 'active_fasting' },
    ]

    function getPhase(elapsedHours: number) {
      return phases.find((p) => elapsedHours >= p.min && elapsedHours < p.max)
    }

    expect(getPhase(0)?.label).toBe('digesting')
    expect(getPhase(2)?.label).toBe('digesting')
    expect(getPhase(4)?.label).toBe('pause')
    expect(getPhase(6)?.label).toBe('pause')
    expect(getPhase(8)?.label).toBe('stored_energy')
    expect(getPhase(10)?.label).toBe('stored_energy')
    expect(getPhase(12)?.label).toBe('active_fasting')
    expect(getPhase(15)?.label).toBe('active_fasting')
  })
})
