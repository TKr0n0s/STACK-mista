import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiPlanSchema } from '@/lib/ai-plan-schema'
import {
  getCachedOrFetchImage,
  getCachedOrFetchImageSmart,
  generateSearchQueries,
  normalizeMealName,
} from '@/lib/pexels'
import { logger } from '@/lib/logger'

/**
 * POST /api/enrich-images
 *
 * Called by the client AFTER receiving a saved plan.
 * Enriches meals that lack image_url with Pexels photos.
 *
 * Phase 8.1 enhancements:
 * - Atomic lock via RPC (try_acquire_enrich_lock) — prevents concurrent calls
 * - Gemini Flash generates unique search queries per dish
 * - Smart scoring + dedup across the plan
 * - Metrics tracking (smart_hit, legacy_hit, pexels_429, gemini_fail, enriched_count)
 * - 5-level fallback chain: Gemini+smart → original search → legacy cache → local → emoji
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Atomic lock via RPC — prevents concurrent enrichment (Hardening #3)
  const { data: lockAcquired } = await supabase.rpc('try_acquire_enrich_lock', {
    p_user_id: user.id,
  })

  if (!lockAcquired) {
    return NextResponse.json({ enriched: 0, reason: 'enriching_in_progress' })
  }

  try {
    const { data: plan } = await supabase
      .from('ai_plans')
      .select('plan_content')
      .eq('user_id', user.id)
      .single()

    if (!plan?.plan_content) {
      return NextResponse.json({ enriched: 0 })
    }

    // Validate with schema — if legacy/invalid JSON, return without breaking
    let planJSON: ReturnType<typeof aiPlanSchema.parse>
    try {
      planJSON = aiPlanSchema.parse(JSON.parse(plan.plan_content))
    } catch {
      return NextResponse.json({ enriched: 0, reason: 'invalid_plan_format' })
    }

    // Collect unique meal names → list of ALL references (for updating all occurrences)
    const mealRefs = new Map<string, Array<{ dayIdx: number; mealKey: string }>>()
    for (let i = 0; i < planJSON.days.length; i++) {
      const meals = planJSON.days[i].meals as Record<
        string,
        { name: string; image_url?: string }
      >
      for (const [key, meal] of Object.entries(meals)) {
        if (!meal.image_url) {
          const normalized = normalizeMealName(meal.name)
          const refs = mealRefs.get(normalized) || []
          refs.push({ dayIdx: i, mealKey: key })
          mealRefs.set(normalized, refs)
        }
      }
    }

    // Idempotent: if all meals already have images, return early
    if (mealRefs.size === 0) {
      return NextResponse.json({ enriched: 0 })
    }

    // Metrics counters (Hardening #6)
    let smart_hit = 0
    let legacy_hit = 0
    let pexels_429 = 0
    let gemini_fail = 0

    // Collect original (non-normalized) names for better Gemini results
    const originalNames: string[] = []
    for (const [normalized] of mealRefs) {
      let found = false
      for (const day of planJSON.days) {
        const meals = day.meals as Record<string, { name: string }>
        for (const meal of Object.values(meals)) {
          if (normalizeMealName(meal.name) === normalized) {
            originalNames.push(meal.name)
            found = true
            break
          }
        }
        if (found) break
      }
    }

    // Generate optimized queries via Gemini (1 batch call)
    let queryMap: Map<string, string[]>
    try {
      queryMap = await generateSearchQueries(originalNames)
    } catch {
      queryMap = new Map()
      gemini_fail = 1
    }
    if (queryMap.size === 0 && originalNames.length > 0) {
      gemini_fail = 1
    }

    // Track used photo IDs for dedup across the plan
    const usedPhotoIds = new Set<number>()
    let enriched = 0
    const entries = [...mealRefs.entries()]

    // Batch with limited concurrency (max 3 simultaneous)
    for (let i = 0; i < entries.length; i += 3) {
      const batch = entries.slice(i, i + 3)
      const results = await Promise.allSettled(
        batch.map(async ([name]) => {
          const queries = queryMap.get(name) || []
          if (queries.length > 0) {
            // Smart path: Gemini queries → scored Pexels search
            const smartResult = await getCachedOrFetchImageSmart(
              name,
              queries,
              usedPhotoIds,
              () => { pexels_429++ }
            )
            if (smartResult) {
              if (smartResult.source === 'smart_hit') smart_hit++
              else if (smartResult.source === 'legacy_hit') legacy_hit++
              return { name, url: smartResult.url }
            }
          }
          // Fallback: original keyword-based search
          return { name, url: await getCachedOrFetchImage(name) }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.url) {
          const refs = mealRefs.get(result.value.name) || []
          for (const ref of refs) {
            const meals = planJSON.days[ref.dayIdx].meals as Record<
              string,
              { name: string; desc: string; kcal: number; image_url?: string }
            >
            meals[ref.mealKey].image_url = result.value.url
          }
          enriched++
        }
      }
    }

    if (enriched > 0) {
      const { error } = await supabase
        .from('ai_plans')
        .update({ plan_content: JSON.stringify(planJSON) })
        .eq('user_id', user.id)

      if (error) {
        logger.error({ error }, 'Failed to update plan with enriched images')
      }
    }

    const metrics = { smart_hit, legacy_hit, pexels_429, gemini_fail, enriched_count: enriched }
    logger.info({ metrics, user_id: user.id }, 'enrich-images completed')

    return NextResponse.json({ enriched, metrics })
  } finally {
    // Release lock — always runs even on error
    await supabase
      .from('ai_plans')
      .update({ enriching_since: null })
      .eq('user_id', user.id)
  }
}
