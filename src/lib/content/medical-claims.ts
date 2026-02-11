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

// Dietary restriction → prohibited food terms mapping.
// Used by buildAllForbiddenTerms() to block foods by dietary restriction.
const DIETARY_RESTRICTION_FOOD_TERMS: Record<string, string[]> = {
  vegetarian: [
    'carne', 'carne bovina', 'carne vermelha', 'carne moida', 'picanha',
    'file mignon', 'patinho', 'acem', 'alcatra', 'maminha', 'costela',
    'frango', 'peito de frango', 'coxa de frango', 'sobrecoxa',
    'frango grelhado', 'frango desfiado',
    'peixe', 'salmao', 'tilapia', 'atum', 'sardinha', 'bacalhau',
    'camarao', 'frutos do mar', 'marisco', 'mariscos',
    'bacon', 'presunto', 'salsicha', 'linguica',
  ],
  vegan: [
    'carne', 'carne bovina', 'carne vermelha', 'carne moida', 'picanha',
    'file mignon', 'patinho', 'acem', 'alcatra', 'maminha', 'costela',
    'frango', 'peito de frango', 'coxa de frango', 'sobrecoxa',
    'frango grelhado', 'frango desfiado',
    'peixe', 'salmao', 'tilapia', 'atum', 'sardinha', 'bacalhau',
    'camarao', 'frutos do mar', 'marisco', 'mariscos',
    'bacon', 'presunto', 'salsicha', 'linguica',
    'leite', 'queijo', 'iogurte', 'manteiga', 'creme de leite',
    'ovo', 'ovos', 'omelete', 'ovos mexidos', 'ovo cozido', 'gema', 'clara',
    'mel',
  ],
  lactose_free: [
    'leite', 'lactose', 'queijo', 'iogurte', 'manteiga', 'creme de leite',
  ],
  gluten_free: [
    'gluten', 'trigo', 'centeio', 'cevada', 'malte',
    'pao', 'macarrao', 'massa', 'farinha de trigo', 'biscoito', 'bolo',
  ],
}

// Maps legacy Portuguese dietary restriction labels to canonical English keys.
const PT_TO_EN_DIETARY_MAP: Record<string, string> = {
  'vegetariana': 'vegetarian',
  'vegana': 'vegan',
  'sem lactose': 'lactose_free',
  'sem gluten': 'gluten_free',
}

export interface UserFoodProfile {
  foods_to_avoid?: string | string[] | null
  dietary_restrictions?: string[] | null
  protein_preference?: string | null
}

/**
 * Builds a unified list of ALL forbidden food terms from:
 * 1. foods_to_avoid (expanded with synonyms)
 * 2. dietary_restrictions → DIETARY_RESTRICTION_FOOD_TERMS
 * 3. protein exclusion (all proteins except preferred)
 *
 * Rule: dietary_restrictions ALWAYS wins over protein_preference.
 */
export function buildAllForbiddenTerms(profile: UserFoodProfile): string[] {
  const allTerms = new Set<string>()

  // 1. foods_to_avoid expanded with synonyms
  for (const t of getExpandedFoodsToAvoid(profile.foods_to_avoid)) {
    allTerms.add(t)
  }

  // 2. dietary_restrictions → prohibited terms (PT→EN fallback for legacy data)
  if (profile.dietary_restrictions) {
    for (const restriction of profile.dietary_restrictions) {
      const key = PT_TO_EN_DIETARY_MAP[normalizeText(restriction)] || restriction
      const terms = DIETARY_RESTRICTION_FOOD_TERMS[key]
      if (terms) terms.forEach(t => allTerms.add(normalizeText(t)))
    }
  }

  // 3. Excluded proteins (dietary_restrictions may have already blocked the preferred one — ok)
  for (const t of getExcludedProteinTerms(profile.protein_preference)) {
    allTerms.add(normalizeText(t))
  }

  return Array.from(allTerms)
}

/**
 * Detects if the user's protein preference conflicts with their dietary restrictions.
 * E.g., vegan + fish = true, vegetarian + eggs = false, vegetarian + meat = true.
 */
export function hasProteinDietConflict(
  dietaryRestrictions: string[] | null | undefined,
  proteinPreference: string | null | undefined
): boolean {
  if (!dietaryRestrictions || !proteinPreference) return false
  const proteinTerms = PROTEIN_GROUPS[proteinPreference]
  if (!proteinTerms) return false

  for (const restriction of dietaryRestrictions) {
    const key = PT_TO_EN_DIETARY_MAP[normalizeText(restriction)] || restriction
    const forbidden = DIETARY_RESTRICTION_FOOD_TERMS[key]
    if (!forbidden) continue
    if (proteinTerms.some(pt => forbidden.includes(normalizeText(pt)))) return true
  }
  return false
}

// Protein groups mapped by preference key.
// Used to build exclusion lists: all proteins EXCEPT the user's preferred one.
const PROTEIN_GROUPS: Record<string, string[]> = {
  chicken: ['frango', 'peito de frango', 'coxa de frango', 'sobrecoxa', 'frango grelhado', 'frango desfiado'],
  fish: ['peixe', 'salmao', 'tilapia', 'atum', 'sardinha', 'bacalhau', 'camarao', 'frutos do mar', 'marisco'],
  meat: ['carne bovina', 'carne vermelha', 'carne moida', 'picanha', 'file mignon', 'patinho', 'acem', 'alcatra', 'maminha', 'costela'],
  eggs: ['ovo', 'ovos', 'omelete', 'ovo cozido', 'ovo mexido', 'ovos mexidos', 'gema', 'clara'],
  legumes: ['grao-de-bico', 'grao de bico', 'lentilha', 'ervilha', 'soja', 'tofu', 'edamame'],
}

/**
 * Returns all protein terms that should be EXCLUDED based on user's preference.
 * If preference is "chicken", returns all fish/meat/eggs/legumes terms.
 * If preference is null/undefined, returns empty (no restriction).
 */
export function getExcludedProteinTerms(preference: string | null | undefined): string[] {
  if (!preference || !PROTEIN_GROUPS[preference]) return []

  return Object.entries(PROTEIN_GROUPS)
    .filter(([key]) => key !== preference)
    .flatMap(([, terms]) => terms)
}
