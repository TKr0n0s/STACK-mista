const PROHIBITED_CLAIMS = [
  /autofag/i,
  /cetose/i,
  /ketosis/i,
  /autophagy/i,
  /cura\s+(de|do|da|para)\b/i,
  /garante\s+(perda|emagrec|resultado)/i,
  /cientificamente\s+comprovad/i,
  /reduz.*ondas de calor/i,
  /emagrec.*garantid/i,
  /substitui.*medico/i,
  /tratamento\s+(medico|clinico|farmacolog)/i,
]

function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function containsMedicalClaims(text: string): boolean {
  const normalized = normalizeText(text)
  return PROHIBITED_CLAIMS.some((regex) => regex.test(normalized))
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function validateAIOutput(
  content: string,
  foodsToAvoid: string[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (containsMedicalClaims(content)) {
    issues.push('medical_claim_detected')
  }

  const normalizedContent = normalizeText(content)
  for (const food of foodsToAvoid) {
    if (!food) continue
    const normalizedFood = normalizeText(food.trim())
    const regex = new RegExp(`\\b${escapeRegex(normalizedFood)}\\b`, 'i')
    if (regex.test(normalizedContent)) {
      issues.push(`prohibited_food: ${food}`)
    }
  }

  return { valid: issues.length === 0, issues }
}
