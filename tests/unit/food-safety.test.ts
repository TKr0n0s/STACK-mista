import { describe, it, expect } from 'vitest'
import {
  buildAllForbiddenTerms,
  hasProteinDietConflict,
  validateAIOutput,
} from '@/lib/content/medical-claims'

describe('buildAllForbiddenTerms — matrix of 12 cases', () => {
  it('vegetariana basico: blocks carne, frango (peixe blocked via protein exclusion)', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: ['vegetarian'],
      protein_preference: 'eggs',
    })
    expect(terms).toContain('carne')
    expect(terms).toContain('frango')
    // peixe is blocked via protein exclusion (eggs excludes fish), NOT via vegetarian restriction
    expect(terms).toContain('peixe')
    // Should NOT block eggs (preferred protein)
    expect(terms).not.toContain('ovo')
  })

  it('vegetariana + peixe: peixe PERMITIDO (pescetariana brasileira)', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: ['vegetarian'],
      protein_preference: 'fish',
    })
    expect(terms).toContain('carne')
    expect(terms).toContain('frango')
    // Fish is allowed — Brazilian vegetarians often eat fish
    expect(terms).not.toContain('peixe')
    expect(terms).not.toContain('salmao')
  })

  it('vegana completo: blocks carne, frango, peixe, leite, ovo', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: ['vegan'],
      protein_preference: 'legumes',
    })
    expect(terms).toContain('carne')
    expect(terms).toContain('frango')
    expect(terms).toContain('peixe')
    expect(terms).toContain('leite')
    expect(terms).toContain('ovo')
    expect(terms).toContain('mel')
  })

  it('sem gluten: blocks pao, trigo, macarrao', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: ['gluten_free'],
      protein_preference: 'chicken',
    })
    expect(terms).toContain('pao')
    expect(terms).toContain('trigo')
    expect(terms).toContain('macarrao')
    // Should NOT block chicken
    expect(terms).not.toContain('frango')
  })

  it('sem lactose: blocks leite, queijo, iogurte', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: ['lactose_free'],
      protein_preference: 'fish',
    })
    expect(terms).toContain('leite')
    expect(terms).toContain('queijo')
    expect(terms).toContain('iogurte')
  })

  it('foods_to_avoid peixe: blocks peixe, salmao, tilapia, atum', () => {
    const terms = buildAllForbiddenTerms({
      foods_to_avoid: 'peixe',
      protein_preference: 'chicken',
    })
    expect(terms).toContain('peixe')
    expect(terms).toContain('salmao')
    expect(terms).toContain('tilapia')
    expect(terms).toContain('atum')
  })

  it('foods_to_avoid pimenta: blocks pimenta and synonyms', () => {
    const terms = buildAllForbiddenTerms({
      foods_to_avoid: 'pimenta',
      protein_preference: 'meat',
    })
    expect(terms).toContain('pimenta')
    expect(terms).toContain('malagueta')
    expect(terms).toContain('pimentao')
  })

  it('conflito vegana+fish: dietary_restrictions wins — peixe blocked', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: ['vegan'],
      protein_preference: 'fish',
    })
    expect(terms).toContain('peixe')
    expect(terms).toContain('salmao')
    expect(terms).toContain('carne')
    expect(terms).toContain('ovo')
  })

  it('conflito vegetariana+meat: carne blocked by diet, peixe by protein exclusion', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: ['vegetarian'],
      protein_preference: 'meat',
    })
    expect(terms).toContain('carne')
    expect(terms).toContain('picanha')
    expect(terms).toContain('frango')
    // peixe blocked via protein exclusion (meat excludes fish), not via vegetarian
    expect(terms).toContain('peixe')
  })

  it('legado portugues: "vegetariana" maps to vegetarian', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: ['vegetariana'],
      protein_preference: 'eggs',
    })
    expect(terms).toContain('carne')
    expect(terms).toContain('frango')
    // peixe blocked via protein exclusion (eggs excludes fish)
    expect(terms).toContain('peixe')
  })

  it('combinado: gluten_free + lactose_free + amendoim', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: ['gluten_free', 'lactose_free'],
      foods_to_avoid: 'amendoim',
      protein_preference: 'chicken',
    })
    // Gluten terms
    expect(terms).toContain('pao')
    expect(terms).toContain('trigo')
    // Lactose terms
    expect(terms).toContain('leite')
    expect(terms).toContain('queijo')
    // Foods to avoid
    expect(terms).toContain('amendoim')
  })

  it('low_carb: does not block specific foods (macro restriction)', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: ['low_carb'],
      protein_preference: 'chicken',
    })
    // low_carb has no entry in DIETARY_RESTRICTION_FOOD_TERMS
    // Only protein exclusion terms should be present
    expect(terms).not.toContain('pao')
    expect(terms).not.toContain('arroz')
  })

  it('nenhum: returns empty when no restrictions', () => {
    const terms = buildAllForbiddenTerms({
      dietary_restrictions: [],
      foods_to_avoid: null,
      protein_preference: null,
    })
    expect(terms).toHaveLength(0)
  })
})

describe('hasProteinDietConflict', () => {
  it('vegan + fish = true', () => {
    expect(hasProteinDietConflict(['vegan'], 'fish')).toBe(true)
  })

  it('vegetarian + eggs = false', () => {
    expect(hasProteinDietConflict(['vegetarian'], 'eggs')).toBe(false)
  })

  it('vegetarian + meat = true', () => {
    expect(hasProteinDietConflict(['vegetarian'], 'meat')).toBe(true)
  })

  it('vegetarian + chicken = true', () => {
    expect(hasProteinDietConflict(['vegetarian'], 'chicken')).toBe(true)
  })

  it('vegetarian + fish = false (pescetarian allowed in Brazil)', () => {
    expect(hasProteinDietConflict(['vegetarian'], 'fish')).toBe(false)
  })

  it('gluten_free + chicken = false', () => {
    expect(hasProteinDietConflict(['gluten_free'], 'chicken')).toBe(false)
  })

  it('lactose_free + fish = false', () => {
    expect(hasProteinDietConflict(['lactose_free'], 'fish')).toBe(false)
  })

  it('null restrictions = false', () => {
    expect(hasProteinDietConflict(null, 'chicken')).toBe(false)
  })

  it('null preference = false', () => {
    expect(hasProteinDietConflict(['vegan'], null)).toBe(false)
  })

  it('legacy PT: vegetariana + meat = true', () => {
    expect(hasProteinDietConflict(['vegetariana'], 'meat')).toBe(true)
  })
})

describe('validateAIOutput with buildAllForbiddenTerms', () => {
  it('rejects plan with peixe for vegan profile', () => {
    const forbidden = buildAllForbiddenTerms({
      dietary_restrictions: ['vegan'],
      protein_preference: 'legumes',
    })
    const result = validateAIOutput(
      'Almoco: Salmao grelhado com legumes',
      forbidden
    )
    expect(result.valid).toBe(false)
  })

  it('rejects plan with carne for vegetarian profile', () => {
    const forbidden = buildAllForbiddenTerms({
      dietary_restrictions: ['vegetarian'],
      protein_preference: 'eggs',
    })
    const result = validateAIOutput(
      'Jantar: Picanha com batata',
      forbidden
    )
    expect(result.valid).toBe(false)
  })

  it('accepts clean plan for vegetarian profile', () => {
    const forbidden = buildAllForbiddenTerms({
      dietary_restrictions: ['vegetarian'],
      protein_preference: 'eggs',
    })
    const result = validateAIOutput(
      'Almoco: Omelete com salada verde',
      forbidden
    )
    expect(result.valid).toBe(true)
  })

  it('accepts salmao for vegetarian+fish profile (pescetarian)', () => {
    const forbidden = buildAllForbiddenTerms({
      dietary_restrictions: ['vegetarian'],
      protein_preference: 'fish',
    })
    const result = validateAIOutput(
      'Almoco: Salmao grelhado com salada',
      forbidden
    )
    expect(result.valid).toBe(true)
  })

  it('rejects pao for gluten_free profile', () => {
    const forbidden = buildAllForbiddenTerms({
      dietary_restrictions: ['gluten_free'],
      protein_preference: 'chicken',
    })
    const result = validateAIOutput(
      'Cafe: Pao integral com abacate',
      forbidden
    )
    expect(result.valid).toBe(false)
  })
})
