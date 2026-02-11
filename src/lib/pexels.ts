import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Pexels food image client with persistent Supabase cache.
 * - Searches always in ENGLISH (better Pexels results)
 * - Curates: prefers landscape photos
 * - Cache: meal_images table via admin client (service_role)
 * - Best-effort: returns null on any failure (never throws)
 */

// PT→EN translation map for Pexels search (longest match first)
const FOOD_PT_TO_EN: Record<string, string> = {
  'salmao grelhado': 'grilled salmon plate',
  'frango grelhado': 'grilled chicken breast',
  'frango desfiado': 'shredded chicken dish',
  'frango ao forno': 'roasted chicken vegetables',
  'peito de frango': 'grilled chicken breast herbs',
  'carne moida': 'ground beef dish rice',
  'carne grelhada': 'grilled beef steak',
  'carne assada': 'roast beef vegetables',
  'omelete de espinafre': 'spinach omelette',
  'ovos mexidos': 'scrambled eggs breakfast',
  'ovo cozido': 'boiled eggs salad',
  'tofu grelhado': 'grilled tofu vegetables',
  'grao de bico': 'chickpea salad bowl',
  'grao-de-bico': 'chickpea salad bowl',
  'sopa de lentilha': 'lentil vegetable soup',
  'sopa de legumes': 'vegetable soup bowl',
  'sopa de frango': 'chicken soup vegetables',
  'creme de abobora': 'pumpkin cream soup',
  'batata doce': 'sweet potato baked plate',
  'panqueca de banana': 'banana pancakes plate',
  'iogurte granola': 'yogurt granola berries',
  'salada caesar': 'caesar salad chicken',
  'arroz integral': 'brown rice plate',
  'pao integral': 'whole wheat bread toast',
  'smoothie verde': 'green smoothie glass',
  'cha verde': 'green tea cup',
  'mingau de aveia': 'oatmeal porridge fruit',
  'abacate torrada': 'avocado toast plate',
  'tilapia assada': 'baked tilapia vegetables',
  'peixe assado': 'baked fish vegetables',
  'peixe grelhado': 'grilled white fish plate',
  'feijao preto': 'black beans rice',
  'legumes grelhados': 'grilled vegetables plate',
  'bowl de quinoa': 'quinoa vegetable bowl',
  'pure de batata': 'mashed potato plate',
  'strogonoff': 'stroganoff rice plate',
  'escondidinho': 'chicken casserole mashed',
  'wrap': 'chicken wrap vegetables',
  'quiche': 'vegetable quiche slice',
  'salmao': 'salmon fillet plate',
  'tilapia': 'grilled tilapia fish',
  'atum': 'tuna steak plate',
  'sardinha': 'grilled sardines',
  'bacalhau': 'codfish traditional plate',
  'camarao': 'grilled shrimp plate',
  'picanha': 'grilled steak plate',
  'bife': 'beef steak plate',
  'frango': 'chicken dish plate',
  'omelete': 'omelette vegetables',
  'ovo': 'egg dish',
  'tofu': 'tofu stir fry',
  'lentilha': 'lentil soup bowl',
  'quinoa': 'quinoa salad bowl',
  'tapioca': 'brazilian tapioca',
  'panqueca': 'pancakes fruit',
  'iogurte': 'yogurt bowl fruit',
  'vitamina': 'fruit smoothie glass',
  'acai': 'acai bowl granola',
  'aveia': 'oatmeal bowl berries',
  'salada': 'fresh salad plate',
  'arroz': 'rice bowl',
  'feijao': 'beans dish',
  'sopa': 'soup bowl',
  'creme': 'cream soup bowl',
  'caldo': 'green soup kale',
  'peixe': 'baked fish plate',
  'carne': 'meat dish plate',
  'legumes': 'roasted vegetables',
  'brocolis': 'steamed broccoli',
  'abobora': 'roasted pumpkin',
  'abobrinha': 'grilled zucchini',
  'batata': 'potato dish',
  'mandioca': 'cassava plate',
  'cha': 'herbal tea cup',
}

// Sort by key length descending for longest-match-first
const SORTED_FOOD_ENTRIES = Object.entries(FOOD_PT_TO_EN).sort(
  (a, b) => b[0].length - a[0].length
)

export function normalizeMealName(name: string): string {
  return name.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function translateToEnglish(mealName: string): string {
  const normalized = normalizeMealName(mealName)
  for (const [pt, en] of SORTED_FOOD_ENTRIES) {
    if (normalized.includes(pt)) return en
  }
  // Fallback: use original name + "food dish"
  return `${mealName} food dish`
}

/**
 * Search Pexels for a food image. Returns medium-size URL or null.
 * - Always searches in English
 * - Prefers landscape photos (width > height)
 * - 5s timeout, returns null on any error
 */
export async function searchFoodImage(mealName: string): Promise<string | null> {
  if (!process.env.PEXELS_API_KEY) return null
  try {
    const query = encodeURIComponent(translateToEnglish(mealName))
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=3&orientation=landscape`,
      {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    // Curate: prefer landscape photo
    const photo =
      data.photos?.find((p: { width: number; height: number }) => p.width > p.height) ||
      data.photos?.[0]
    return photo?.src?.medium || null
  } catch {
    return null
  }
}

/**
 * Get cached image URL or fetch from Pexels and cache.
 * Uses admin client (service_role) to write to meal_images table.
 * Returns null if no SERVICE_ROLE_KEY or Pexels fails.
 */
export async function getCachedOrFetchImage(mealName: string): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const normalized = normalizeMealName(mealName)
  const admin = createAdminClient()

  // 1. Check cache
  const { data } = await admin
    .from('meal_images')
    .select('image_url')
    .eq('meal_name_normalized', normalized)
    .single()
  if (data?.image_url) return data.image_url

  // 2. Fetch from Pexels (only for cache misses)
  const url = await searchFoodImage(mealName)
  if (!url) return null

  // 3. Cache with upsert (admin client bypasses RLS)
  await admin.from('meal_images').upsert(
    { meal_name_normalized: normalized, image_url: url },
    { onConflict: 'meal_name_normalized' }
  )
  return url
}
