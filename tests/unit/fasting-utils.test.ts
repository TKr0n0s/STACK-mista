import { describe, it, expect } from 'vitest'
import { getFastingRatio } from '@/lib/fasting-utils'

describe('getFastingRatio', () => {
  it('20h-12h = 16:8', () => {
    const result = getFastingRatio(20, 12)
    expect(result.fasting).toBe(16)
    expect(result.eating).toBe(8)
    expect(result.label).toBe('16:8')
    expect(result.invalid).toBe(false)
  })

  it('22h-12h = 14:10', () => {
    const result = getFastingRatio(22, 12)
    expect(result.fasting).toBe(14)
    expect(result.eating).toBe(10)
  })

  it('18h-12h = 18:6', () => {
    const result = getFastingRatio(18, 12)
    expect(result.fasting).toBe(18)
    expect(result.eating).toBe(6)
  })

  it('same hour returns invalid', () => {
    const result = getFastingRatio(12, 12)
    expect(result.invalid).toBe(true)
  })
})
