const PROHIBITED_CLAIMS = [
  /autofag/i,
  /cetose/i,
  /ketosis/i,
  /autophagy/i,
  /\bcura\b/i,
  /garante\s+(perda|emagrec|resultado)/i,
  /comprovad(o|a).*(cientific|estud)/i,
  /reduz.*ondas de calor/i,
  /emagrec.*garantid/i,
  /substitui.*medico/i,
  /\btratamento\b/i,
]

// Groups used to expand "foods_to_avoid" into common aliases/synonyms.
// This avoids false negatives like blocking "peixe" but allowing "salmao".
const FOOD_EQUIVALENT_GROUPS: string[][] = [
  [
    'peixe',
    'peixes',
    'salmao',
    'tilapia',
    'atum',
    'sardinha',
    'bacalhau',
    'camarao',
    'frutos do mar',
    'marisco',
    'mariscos',
  ],
  [
    'pimenta',
    'pimentas',
    'pimenta do reino',
    'pimenta calabresa',
    'malagueta',
    'jalapeno',
    'chili',
    'pimenta biquinho',
    'pimentao',
  ],
  [
    'leite',
    'lactose',
    'queijo',
    'iogurte',
    'manteiga',
    'creme de leite',
  ],
  ['ovo', 'ovos', 'omelete', 'ovos mexidos', 'ovo cozido', 'gema', 'clara'],
  ['gluten', 'trigo', 'centeio', 'cevada', 'malte'],
  ['amendoim', 'amendoins', 'pasta de amendoim'],
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

function buildFoodRegex(food: string): RegExp {
  const normalizedFood = normalizeText(food).trim()
  const words = normalizedFood
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => escapeRegex(w))

  if (words.length === 0) {
    return /$^/ // never matches
  }

  return new RegExp(`\\b${words.join('[\\s-]+')}\\b`, 'i')
}

export function parseFoodsToAvoid(rawFoods: string | string[] | null | undefined): string[] {
  if (!rawFoods) return []

  const rawItems = Array.isArray(rawFoods)
    ? rawFoods
    : rawFoods.split(/[,\n;]+|\s+\bou\b\s+|\s+\be\b\s+/gi)

  const deduped = new Set<string>()
  for (const item of rawItems) {
    const normalized = normalizeText(item).trim()
    if (normalized) deduped.add(normalized)
  }

  return Array.from(deduped)
}

export function getExpandedFoodsToAvoid(
  rawFoods: string | string[] | null | undefined
): string[] {
  const baseFoods = parseFoodsToAvoid(rawFoods)
  const expanded = new Set<string>(baseFoods)

  for (const food of baseFoods) {
    if (!food) continue

    // Simple singular/plural normalization
    if (food.endsWith('s') && food.length > 1) {
      expanded.add(food.slice(0, -1))
    } else {
      expanded.add(`${food}s`)
    }

    for (const group of FOOD_EQUIVALENT_GROUPS) {
      const normalizedGroup = group.map((term) => normalizeText(term))
      if (normalizedGroup.includes(food)) {
        normalizedGroup.forEach((term) => expanded.add(term))
      }
    }
  }

  return Array.from(expanded)
}

export function validateAIOutput(
  content: string,
  foodsToAvoid: string[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (containsMedicalClaims(content)) {
    issues.push('medical_claim_detected')
  }

  const prohibitedFoodsFound = findProhibitedFoods(content, foodsToAvoid)
  for (const food of prohibitedFoodsFound) {
    issues.push(`prohibited_food: ${food}`)
  }

  return { valid: issues.length === 0, issues }
}

export function findProhibitedFoods(
  content: string,
  foodsToAvoid: string[] | string | null | undefined
): string[] {
  if (!content) return []

  const normalizedContent = normalizeText(content)
  const expandedFoodsToAvoid = getExpandedFoodsToAvoid(foodsToAvoid)
  const found = new Set<string>()

  for (const food of expandedFoodsToAvoid) {
    const regex = buildFoodRegex(food)
    if (regex.test(normalizedContent)) {
      found.add(food)
    }
  }

  return Array.from(found)
}

export function containsProhibitedFood(
  content: string,
  foodsToAvoid: string[] | string | null | undefined
): boolean {
  return findProhibitedFoods(content, foodsToAvoid).length > 0
}
