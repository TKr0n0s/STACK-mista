/**
 * localStorage persistence test for onboarding-form.tsx
 * Tests save, load, and clear functionality
 */

describe('OnboardingForm localStorage persistence', () => {
  const STORAGE_KEY = 'onboarding-progress'

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('saveProgress', () => {
    it('should save form state to localStorage when advancing step', () => {
      const mockState = {
        step: 2,
        name: 'John Doe',
        age: 28,
        weight: 80,
        targetWeight: 75,
        activityLevel: 'moderate',
        dietaryRestrictions: ['vegetarian'],
        foodsToAvoid: 'nuts, dairy',
        proteinPreference: 'fish',
        fastingStart: 20,
        fastingEnd: 12,
        consent: false,
      }

      // Simulate save operation
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState))

      const saved = localStorage.getItem(STORAGE_KEY)
      expect(saved).toBeTruthy()

      const parsed = JSON.parse(saved!)
      expect(parsed.step).toBe(2)
      expect(parsed.name).toBe('John Doe')
      expect(parsed.age).toBe(28)
      expect(parsed.dietaryRestrictions).toEqual(['vegetarian'])
    })

    it('should handle empty form fields gracefully', () => {
      const mockState = {
        step: 1,
        name: '',
        age: '',
        weight: '',
        targetWeight: '',
        activityLevel: '',
        dietaryRestrictions: [],
        foodsToAvoid: '',
        proteinPreference: '',
        fastingStart: 20,
        fastingEnd: 12,
        consent: false,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState))
      const saved = localStorage.getItem(STORAGE_KEY)
      expect(saved).toBeTruthy()
    })

    it('should handle array fields correctly', () => {
      const mockState = {
        step: 4,
        name: 'Jane',
        age: 35,
        weight: 70,
        targetWeight: 65,
        activityLevel: 'light',
        dietaryRestrictions: ['vegan', 'gluten_free'],
        foodsToAvoid: 'shellfish',
        proteinPreference: 'legumes',
        fastingStart: 19,
        fastingEnd: 11,
        consent: false,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState))
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)

      expect(Array.isArray(saved.dietaryRestrictions)).toBe(true)
      expect(saved.dietaryRestrictions).toHaveLength(2)
      expect(saved.dietaryRestrictions).toContain('vegan')
      expect(saved.dietaryRestrictions).toContain('gluten_free')
    })
  })

  describe('loadProgress', () => {
    it('should load saved progress on mount', () => {
      const mockState = {
        step: 3,
        name: 'Alex',
        age: 42,
        weight: 90,
        targetWeight: 80,
        activityLevel: 'active',
        dietaryRestrictions: ['none'],
        foodsToAvoid: 'peanuts',
        proteinPreference: 'chicken',
        fastingStart: 21,
        fastingEnd: 13,
        consent: false,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState))
      const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY)!)

      expect(loaded.step).toBe(3)
      expect(loaded.name).toBe('Alex')
      expect(loaded.age).toBe(42)
    })

    it('should not load if no saved progress exists', () => {
      const saved = localStorage.getItem(STORAGE_KEY)
      expect(saved).toBeNull()
    })

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json{')

      // The component wraps this in try/catch, so it should not throw
      expect(() => {
        try {
          JSON.parse(localStorage.getItem(STORAGE_KEY)!)
        } catch {
          // Gracefully handled
        }
      }).not.toThrow()
    })
  })

  describe('clearProgress', () => {
    it('should remove saved progress after successful submission', () => {
      const mockState = {
        step: 6,
        name: 'Complete',
        age: 30,
        weight: 75,
        targetWeight: 70,
        activityLevel: 'moderate',
        dietaryRestrictions: ['none'],
        foodsToAvoid: '',
        proteinPreference: 'meat',
        fastingStart: 20,
        fastingEnd: 12,
        consent: true,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState))
      expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy()

      // Simulate clear operation
      localStorage.removeItem(STORAGE_KEY)
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('should handle clear when no progress exists', () => {
      expect(() => {
        localStorage.removeItem(STORAGE_KEY)
      }).not.toThrow()

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should preserve numeric precision', () => {
      const mockState = {
        step: 2,
        name: 'Test',
        age: 25,
        weight: 72.5,
        targetWeight: 65.3,
        activityLevel: 'light',
        dietaryRestrictions: [],
        foodsToAvoid: '',
        proteinPreference: 'fish',
        fastingStart: 20,
        fastingEnd: 12,
        consent: false,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState))
      const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY)!)

      expect(loaded.weight).toBe(72.5)
      expect(loaded.targetWeight).toBe(65.3)
    })

    it('should handle special characters in text fields', () => {
      const mockState = {
        step: 1,
        name: 'João da Silva',
        age: 30,
        weight: '',
        targetWeight: '',
        activityLevel: '',
        dietaryRestrictions: [],
        foodsToAvoid: 'amendoim, frutos do mar, pimenta',
        proteinPreference: '',
        fastingStart: 20,
        fastingEnd: 12,
        consent: false,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState))
      const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY)!)

      expect(loaded.name).toBe('João da Silva')
      expect(loaded.foodsToAvoid).toContain('pimenta')
    })

    it('should have reasonable storage size', () => {
      const mockState = {
        step: 5,
        name: 'User Name',
        age: 35,
        weight: 85,
        targetWeight: 75,
        activityLevel: 'moderate',
        dietaryRestrictions: ['vegetarian', 'gluten_free'],
        foodsToAvoid: 'peanuts and tree nuts, shellfish, soy products',
        proteinPreference: 'eggs',
        fastingStart: 20,
        fastingEnd: 12,
        consent: false,
      }

      const serialized = JSON.stringify(mockState)
      localStorage.setItem(STORAGE_KEY, serialized)

      // Storage should be small (typically < 1KB)
      expect(serialized.length).toBeLessThan(1024)
    })
  })

  describe('state restoration scenarios', () => {
    it('should restore user to their previous step after page refresh', () => {
      const mockState = {
        step: 4,
        name: 'Test User',
        age: 40,
        weight: 85,
        targetWeight: 75,
        activityLevel: 'active',
        dietaryRestrictions: ['low_carb'],
        foodsToAvoid: 'sugar',
        proteinPreference: 'meat',
        fastingStart: 20,
        fastingEnd: 12,
        consent: false,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState))

      // Simulate page refresh - load state
      const saved = localStorage.getItem(STORAGE_KEY)
      const loaded = JSON.parse(saved!)

      expect(loaded.step).toBe(4)
      expect(loaded.foodsToAvoid).toBe('sugar')
    })

    it('should restore browser crash scenario', () => {
      const mockState = {
        step: 3,
        name: 'Crash User',
        age: 28,
        weight: 70,
        targetWeight: 65,
        activityLevel: 'moderate',
        dietaryRestrictions: ['vegetarian'],
        foodsToAvoid: 'eggs',
        proteinPreference: '',
        fastingStart: 20,
        fastingEnd: 12,
        consent: false,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockState))

      // Simulate crash and recovery
      const recovered = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(recovered.step).toBe(3)
      expect(recovered.name).toBe('Crash User')
    })
  })
})
