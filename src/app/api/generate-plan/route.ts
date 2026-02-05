import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGeminiModel } from '@/lib/gemini'
import { aiRateLimiter } from '@/lib/rate-limit'
import { validateAIOutput } from '@/lib/content/medical-claims'
import { sanitizePromptInput } from '@/lib/content/sanitize-prompt'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use order+limit instead of .single() to handle missing UNIQUE constraint
  const { data: plans } = await supabase
    .from('ai_plans')
    .select('plan_content, regenerations_today, last_regenerated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const data = plans?.[0]
  if (!data) {
    return NextResponse.json({ plan_content: null })
  }

  // Reset regeneration count if not today
  const lastRegen = new Date(data.last_regenerated_at || 0)
  const isToday = lastRegen.toDateString() === new Date().toDateString()

  return NextResponse.json({
    plan_content: data.plan_content,
    regenerations_today: isToday ? data.regenerations_today : 0,
  })
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const { success } = await aiRateLimiter.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.profile_completed) {
    return NextResponse.json(
      { error: 'Complete seu perfil primeiro' },
      { status: 400 }
    )
  }

  // Check regeneration limit (3/day) — use order+limit to handle missing UNIQUE
  const { data: existingPlans } = await supabase
    .from('ai_plans')
    .select('id, regenerations_today, last_regenerated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const existingPlan = existingPlans?.[0] ?? null

  if (existingPlan) {
    const lastRegen = new Date(existingPlan.last_regenerated_at || 0)
    const isToday =
      lastRegen.toDateString() === new Date().toDateString()
    if (isToday && existingPlan.regenerations_today >= 3) {
      return NextResponse.json(
        { error: 'Limite de 3 geracoes por dia atingido' },
        { status: 429 }
      )
    }
  }

  // Sanitize user inputs to prevent prompt injection (A4)
  const sanitizedName = sanitizePromptInput(profile.name || '', 50)
  const sanitizedFoodsToAvoid = sanitizePromptInput(
    profile.foods_to_avoid || '',
    200
  )
  const sanitizedRestrictions = (profile.dietary_restrictions || [])
    .map((r: string) => sanitizePromptInput(r, 50))
    .join(', ')

  const prompt = `Voce e uma nutricionista especializada em jejum intermitente para mulheres na menopausa. Crie um plano personalizado de jejum intermitente 16:8.

Dados da paciente:
- Nome: ${sanitizedName}
- Idade: ${profile.age}
- Peso atual: ${profile.weight}kg / Peso desejado: ${profile.target_weight}kg
- Nivel de atividade: ${profile.activity_level}
- Restricoes: ${sanitizedRestrictions || 'nenhuma'}
- NAO come: ${sanitizedFoodsToAvoid || 'nenhuma restricao'}
- Proteina preferida: ${profile.protein_preference}

REGRAS:
- NUNCA sugira alimentos de "NAO come"
- Use APENAS ingredientes comuns no Brasil
- Use o nome ${sanitizedName} ao longo do texto
- Tom acolhedor e motivador. Portugues brasileiro.
- NAO faca claims medicos ("cura", "garante perda de peso", "autofagia", "cetose")
- Formato: markdown estruturado`

  let attempts = 0
  const maxAttempts = 3
  let lastError: string | null = null

  while (attempts < maxAttempts) {
    attempts++
    try {
      const result = await getGeminiModel().generateContent(prompt)
      const content = result.response.text()

      if (!content || content.trim().length < 50) {
        lastError = 'empty_response'
        logger.warn({ attempt: attempts }, 'Gemini returned empty/short response')
        continue
      }

      // Validate output
      const validation = validateAIOutput(
        content,
        profile.foods_to_avoid?.split(',').map((f: string) => f.trim()) || []
      )

      if (!validation.valid) {
        lastError = `validation_failed: ${validation.issues.join(', ')}`
        logger.warn(
          { issues: validation.issues, attempt: attempts },
          'AI output validation failed'
        )
        continue
      }

      // Save plan — use explicit update/insert since ai_plans lacks UNIQUE(user_id)
      const regenCount =
        existingPlan &&
        new Date(existingPlan.last_regenerated_at || 0).toDateString() ===
          new Date().toDateString()
          ? existingPlan.regenerations_today + 1
          : 1

      const planPayload = {
        plan_content: content,
        regenerations_today: regenCount,
        last_regenerated_at: new Date().toISOString(),
      }

      if (existingPlan) {
        const { error: updateError } = await supabase
          .from('ai_plans')
          .update(planPayload)
          .eq('id', existingPlan.id)

        if (updateError) {
          logger.error({ updateError }, 'Failed to update ai_plan')
        }
      } else {
        const { error: insertError } = await supabase
          .from('ai_plans')
          .insert({ user_id: user.id, ...planPayload })

        if (insertError) {
          logger.error({ insertError }, 'Failed to insert ai_plan')
        }
      }

      return NextResponse.json({
        plan_content: content,
        regenerations_today: regenCount,
      })
    } catch (err) {
      lastError = `api_error: ${err instanceof Error ? err.message : 'unknown'}`
      logger.error({ err, attempt: attempts }, 'Gemini generation failed')
    }
  }

  logger.error({ lastError, totalAttempts: attempts }, 'All plan generation attempts failed')

  return NextResponse.json(
    { error: 'Erro ao gerar plano. Tente novamente mais tarde.' },
    { status: 500 }
  )
}
