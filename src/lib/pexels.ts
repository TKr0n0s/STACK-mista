import { createAdminClient } from '@/lib/supabase/admin'
import { getGeminiJsonModel } from '@/lib/gemini'
import { SchemaType, type ResponseSchema } from '@google/generative-ai'
import { z } from 'zod'

/**
 * Pexels food image client with persistent Supabase cache.
 * - Searches always in ENGLISH (better Pexels results)
 * - Curates: prefers landscape photos
 * - Cache: meal_images table via admin client (service_role)
 * - Best-effort: returns null on any failure (never throws)
 *
 * Phase 8.1 additions:
 * - generateSearchQueries(): Gemini-powered query generation for unique images
 * - smartSearchPexels(): Scored search with dedup across plan
 * - getCachedOrFetchImageSmart(): Cache-aware smart search with gradual rehydration
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

// ---------------------------------------------------------------------------
// Phase 8.1: Smart image search with Gemini + scoring + dedup
// ---------------------------------------------------------------------------

// Gemini response schema for search query generation
const SEARCH_QUERY_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      meal: { type: SchemaType.STRING },
      queries: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
    },
    required: ['meal', 'queries'],
  },
}

// Zod validation for Gemini response (Hardening #4)
const searchQueryResponseSchema = z.array(
  z.object({
    meal: z.string().min(1),
    queries: z.array(z.string().min(1)).min(1).max(3),
  })
)

/**
 * Use Gemini Flash to generate optimized English search queries for each meal.
 * Returns Map<normalizedName, string[]> with up to 2 queries per meal.
 * Returns empty Map on any failure (Gemini unavailable, Zod validation, etc).
 */
export async function generateSearchQueries(
  mealNames: string[]
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  if (mealNames.length === 0) return result

  try {
    const model = getGeminiJsonModel(SEARCH_QUERY_SCHEMA)
    const prompt = `You are a food photography search expert. Given these Brazilian meal names, generate 2 different English search queries for each to find UNIQUE stock photos.

RULES:
- Each query: 2-5 words describing the VISUAL appearance
- Query 1: Most specific (ingredients + plating + cooking method)
- Query 2: Broader alternative angle/style
- CRITICAL: Meals with the same protein MUST get DIFFERENT queries. Focus on SIDE DISHES, GARNISHES, and COOKING METHOD to differentiate visually.

Meals:
${mealNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`

    const res = await model.generateContent(prompt)
    const parsed = searchQueryResponseSchema.parse(
      JSON.parse(res.response.text())
    )

    for (const item of parsed) {
      const normalized = normalizeMealName(item.meal)
      result.set(normalized, item.queries.slice(0, 2))
    }
  } catch {
    // Gemini or Zod failed — caller falls back to original search
  }
  return result
}

interface PexelsPhoto {
  id: number
  width: number
  height: number
  src: { medium: string }
}

function scorePhoto(photo: PexelsPhoto): number {
  let score = 0
  if (photo.width > photo.height) score += 30 // landscape bonus
  if (photo.width >= 800) score += 20 // resolution bonus
  const ratio = photo.width / photo.height
  if (ratio >= 1.2 && ratio <= 1.8) score += 15 // ideal aspect ratio
  return score
}

/**
 * Search Pexels with multiple queries, score results, and deduplicate.
 * Tracks pexels_429 count via callback for metrics.
 * Returns best non-duplicate photo or null.
 */
export async function smartSearchPexels(
  queries: string[],
  usedPhotoIds: Set<number>,
  on429?: () => void
): Promise<{ url: string; photoId: number } | null> {
  if (!process.env.PEXELS_API_KEY) return null

  const allPhotos: Array<PexelsPhoto & { queryRank: number }> = []

  for (let i = 0; i < queries.length; i++) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(queries[i])}&per_page=3&orientation=landscape`,
        {
          headers: { Authorization: process.env.PEXELS_API_KEY },
          signal: AbortSignal.timeout(5000),
        }
      )
      if (res.status === 429) {
        on429?.()
        break // rate limited — stop immediately (Hardening #1)
      }
      if (!res.ok) continue
      const data = await res.json()
      for (const photo of data.photos || []) {
        allPhotos.push({ ...photo, queryRank: i })
      }
    } catch {
      continue
    }
  }

  if (allPhotos.length === 0) return null

  const scored = allPhotos
    .map((p) => ({
      ...p,
      totalScore:
        scorePhoto(p) +
        (usedPhotoIds.has(p.id) ? -100 : 0) + // duplicate penalty
        (2 - p.queryRank) * 10, // prefer first (more specific) query
    }))
    .sort((a, b) => b.totalScore - a.totalScore)

  const best = scored[0]
  if (best.totalScore < -50) return null // all duplicates

  return { url: best.src.medium, photoId: best.id }
}

/**
 * Smart cache-aware image fetch with gradual rehydration.
 * - Trusts only 'pexels_smart' cache entries
 * - Rehydrates legacy entries on demand (Hardening #2 + #5)
 * - Falls back to original search if smart search fails
 * Returns { url, source } for metrics tracking or null.
 */
export async function getCachedOrFetchImageSmart(
  mealName: string,
  queries: string[],
  usedPhotoIds: Set<number>,
  on429?: () => void
): Promise<{ url: string; source: 'smart_hit' | 'legacy_hit' | 'pexels_smart' | 'pexels_fallback' } | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const normalized = normalizeMealName(mealName)
  const admin = createAdminClient()

  // 1. Check cache — only trust 'pexels_smart' source
  const { data } = await admin
    .from('meal_images')
    .select('image_url, pexels_photo_id, source')
    .eq('meal_name_normalized', normalized)
    .single()

  if (data?.image_url && data.source === 'pexels_smart') {
    if (data.pexels_photo_id) usedPhotoIds.add(data.pexels_photo_id)
    return { url: data.image_url, source: 'smart_hit' }
  }
  // source == 'legacy' or 'pexels_fallback' → treat as miss, re-fetch with smart queries

  // 2. Smart search with dedup
  const result = await smartSearchPexels(queries, usedPhotoIds, on429)
  if (!result) {
    // 3. Fallback: use legacy cache if available (better than nothing)
    if (data?.image_url) return { url: data.image_url, source: 'legacy_hit' }
    // 4. Last resort: original keyword-based search
    const fallbackUrl = await searchFoodImage(mealName)
    if (fallbackUrl) {
      await admin.from('meal_images').upsert(
        { meal_name_normalized: normalized, image_url: fallbackUrl, source: 'pexels_fallback' },
        { onConflict: 'meal_name_normalized' }
      )
      return { url: fallbackUrl, source: 'pexels_fallback' }
    }
    return null
  }

  usedPhotoIds.add(result.photoId)

  // 5. Cache with photo ID (upsert overwrites legacy)
  await admin.from('meal_images').upsert(
    {
      meal_name_normalized: normalized,
      image_url: result.url,
      pexels_photo_id: result.photoId,
      source: 'pexels_smart',
    },
    { onConflict: 'meal_name_normalized' }
  )
  return { url: result.url, source: 'pexels_smart' }
}
