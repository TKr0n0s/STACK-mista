import { describe, it, expect } from 'vitest'
import {
  containsMedicalClaims,
  validateAIOutput,
} from '@/lib/content/medical-claims'

describe('containsMedicalClaims', () => {
  it('detects "autofagia"', () => {
    expect(containsMedicalClaims('O jejum ativa a autofagia celular')).toBe(true)
  })

  it('detects "cetose"', () => {
    expect(containsMedicalClaims('Entrando em cetose apos 12h')).toBe(true)
  })

  it('detects "autophagy" in English', () => {
    expect(containsMedicalClaims('autophagy is triggered')).toBe(true)
  })

  it('detects "cura" as standalone word', () => {
    expect(containsMedicalClaims('esse alimento cura doencas')).toBe(true)
  })

  it('detects "comprovado cientificamente"', () => {
    expect(containsMedicalClaims('metodo comprovado por estudos')).toBe(true)
  })

  it('detects "garante"', () => {
    expect(containsMedicalClaims('garante perda de peso')).toBe(true)
  })

  it('detects "tratamento"', () => {
    expect(containsMedicalClaims('tratamento para menopausa')).toBe(true)
  })

  it('detects "substitui medico"', () => {
    expect(containsMedicalClaims('este app substitui medico')).toBe(true)
  })

  it('passes safe motivational content', () => {
    expect(
      containsMedicalClaims(
        'Voce esta no caminho certo! Continue se hidratando.'
      )
    ).toBe(false)
  })

  it('passes safe dietary content', () => {
    expect(
      containsMedicalClaims(
        'Salada proteica com frango grelhado e legumes frescos.'
      )
    ).toBe(false)
  })

  it('passes safe exercise content', () => {
    expect(
      containsMedicalClaims('Caminhada leve de 30 minutos ao ar livre.')
    ).toBe(false)
  })
})

describe('validateAIOutput', () => {
  it('detects prohibited foods', () => {
    const result = validateAIOutput('Salada com camarao grelhado', ['camarao'])
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('prohibited_food: camarao')
  })

  it('passes when no prohibited foods found', () => {
    const result = validateAIOutput('Salada com frango grelhado', ['camarao'])
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('detects medical claims in AI output', () => {
    const result = validateAIOutput(
      'Este plano garante emagrecimento rapido',
      []
    )
    expect(result.valid).toBe(false)
    expect(result.issues).toContain('medical_claim_detected')
  })

  it('combines food and medical claim issues', () => {
    const result = validateAIOutput(
      'O camarao ajuda na autofagia celular',
      ['camarao']
    )
    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThanOrEqual(2)
  })

  it('handles empty foods_to_avoid', () => {
    const result = validateAIOutput('Frango grelhado com arroz', [])
    expect(result.valid).toBe(true)
  })

  it('uses word boundary matching for foods', () => {
    // "carne" should not match "carneiro" as a prohibited food
    const result = validateAIOutput('Carneiro assado com batata', ['carne'])
    expect(result.valid).toBe(true)
  })

  it('matches exact food words', () => {
    const result = validateAIOutput('Arroz com carne moida', ['carne'])
    expect(result.valid).toBe(false)
  })
})
