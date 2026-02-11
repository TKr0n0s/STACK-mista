import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiPlanSchema } from '@/lib/ai-plan-schema'
import { getCachedOrFetchImage, normalizeMealName } from '@/lib/pexels'
import { logger } from '@/lib/logger'

/**
 * POST /api/enrich-images
 *
 * Called by the client AFTER receiving a saved plan.
 * Enriches meals that lack image_url with Pexels photos.
 *
 * - Validates plan_content with aiPlanSchema (legacy/invalid → no-op)
 * - Deduplicates by normalized meal name
 * - Batch with max 3 concurrent Pexels requests
 * - Idempotent: returns early if all meals already have image_url
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  // Batch with limited concurrency (max 3 simultaneous)
  let enriched = 0
  const entries = [...mealRefs.entries()]

  for (let i = 0; i < entries.length; i += 3) {
    const batch = entries.slice(i, i + 3)
    const results = await Promise.allSettled(
      batch.map(async ([name]) => ({
        name,
        url: await getCachedOrFetchImage(name),
      }))
    )

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.url) {
        // Update ALL occurrences of this meal name
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

  return NextResponse.json({ enriched })
}
