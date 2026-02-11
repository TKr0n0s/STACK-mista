import { describe, expect, it } from 'vitest'
import { sanitizeDayForFoodSafety } from '@/lib/content/day-safety'
import type { Week1Day } from '@/lib/types'

const sampleDay: Week1Day = {
  day: 1,
  title: 'Dia 1',
  meals: {
    breakfast: {
      name: 'Omelete com legumes',
      desc: 'Ovos mexidos com tomate e espinafre',
      image: 'spinach-omelette.jpg',
      kcal: 320,
    },
    lunch: {
      name: 'Tilapia grelhada',
      desc: 'Peixe com arroz integral e salada',
      image: 'baked-fish-veggies.jpg',
      kcal: 430,
    },
    dinner: {
      name: 'Sopa de legumes',
      desc: 'Sopa cremosa sem carnes',
      image: 'creamy-veggie-soup.jpg',
      kcal: 290,
    },
  },
  hydration: {
    water: '2L',
    tea: 'Cha verde',
    tip: 'Beba agua ao longo do dia',
  },
  exercise: {
    name: 'Caminhada',
    desc: '30 minutos',
  },
  tip: 'Dica',
  did_you_know: 'Curiosidade',
  motivation: 'Motivacao',
}

describe('sanitizeDayForFoodSafety', () => {
  it('replaces prohibited meals with safe fallback', () => {
    const sanitized = sanitizeDayForFoodSafety(sampleDay, 'peixe')
    expect(sanitized.meals.lunch.name).toBe('Almoco personalizado')
    expect(sanitized.meals.lunch.image).toBe('rice-beans.jpg')
    expect(sanitized.meals.breakfast.name).toBe('Omelete com legumes')
  })

  it('returns original day when no foods are blocked', () => {
    const sanitized = sanitizeDayForFoodSafety(sampleDay, '')
    expect(sanitized).toEqual(sampleDay)
  })
})
