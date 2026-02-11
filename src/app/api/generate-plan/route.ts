import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGeminiModel } from '@/lib/gemini'
import { aiRateLimiter } from '@/lib/rate-limit'
import {
  getExpandedFoodsToAvoid,
  getExcludedProteinTerms,
  parseFoodsToAvoid,
  validateAIOutput,
  buildAllForbiddenTerms,
  hasProteinDietConflict,
} from '@/lib/content/medical-claims'
import { sanitizePromptInput } from '@/lib/content/sanitize-prompt'
import { logger } from '@/lib/logger'
import { getFastingRatio } from '@/lib/fasting-utils'
import { aiPlanSchema, stripCodeFences } from '@/lib/ai-plan-schema'
import { buildSafeFallbackPlan } from '@/lib/content/safe-plan-fallback'

function getProgramWeek(date: Date, programStartDate: string): number {
  const start = new Date(programStartDate)
  const daysSinceStart = Math.floor((date.getTime() - start.getTime()) / 86400000)
  return Math.floor(daysSinceStart / 7) + 1
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: plan } = await supabase
    .from('ai_plans')
    .select('plan_content, regenerations_today, last_regenerated_at')
    .eq('user_id', user.id)
    .single()

  if (!plan) {
    return NextResponse.json({ plan_content: null, stale: false })
  }

  // Reset regeneration count if not today
  const lastRegen = new Date(plan.last_regenerated_at || 0)
  const isToday = lastRegen.toDateString() === new Date().toDateString()

  // Determine if plan is stale (generated for a different program week)
  let stale = false
  const { data: profile } = await supabase
    .from('users')
    .select('program_start_date, created_at')
    .eq('id', user.id)
    .single()

  if (profile) {
    const programStart = profile.program_start_date || profile.created_at
    const planWeek = getProgramWeek(lastRegen, programStart)
    const currentWeek = getProgramWeek(new Date(), programStart)
    stale = planWeek !== currentWeek
  }

  return NextResponse.json({
    plan_content: plan.plan_content,
    regenerations_today: isToday ? plan.regenerations_today : 0,
    stale,
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

  // Check regeneration limit (3/day)
  const { data: existingPlan } = await supabase
    .from('ai_plans')
    .select('regenerations_today, last_regenerated_at')
    .eq('user_id', user.id)
    .single()

  if (existingPlan) {
    const lastRegen = new Date(existingPlan.last_regenerated_at || 0)
    const isToday = lastRegen.toDateString() === new Date().toDateString()
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
  const parsedFoodsToAvoid = parseFoodsToAvoid(profile.foods_to_avoid)
  const expandedFoodsToAvoid = getExpandedFoodsToAvoid(parsedFoodsToAvoid)
  const foodsToAvoidPrompt = expandedFoodsToAvoid.join(', ')

  // Build protein exclusion list
  const excludedProteinTerms = getExcludedProteinTerms(profile.protein_preference)
  const excludedProteinsPrompt = excludedProteinTerms.join(', ')

  // Canonical merged validation list (foods_to_avoid + dietary_restrictions + protein exclusion)
  const allFoodsToValidate = buildAllForbiddenTerms({
    foods_to_avoid: profile.foods_to_avoid,
    dietary_restrictions: profile.dietary_restrictions,
    protein_preference: profile.protein_preference,
  })

  // Detect conflict: dietary restriction blocks the preferred protein
  const conflict = hasProteinDietConflict(profile.dietary_restrictions, profile.protein_preference)

  const ratio = getFastingRatio(profile.fasting_start_hour ?? 20, profile.fasting_end_hour ?? 12)

  // Build protein section of prompt based on conflict detection
  const proteinPromptSection = conflict
    ? `- Use SOMENTE proteinas compativeis com as restricoes acima (${sanitizedRestrictions}).`
    : `- Proteina UNICA permitida: ${profile.protein_preference || 'qualquer'}. TODAS as refeicoes devem usar SOMENTE esta proteina.${excludedProteinsPrompt ? `\n- PROTEINAS PROIBIDAS (nao usar em hipotese alguma): ${excludedProteinsPrompt}` : ''}`

  const proteinRuleSection = conflict
    ? `- PROTEINA: Use SOMENTE proteinas compativeis com as restricoes dieteticas. NAO use proteinas de origem animal se a restricao proibir.`
    : `- PROTEINA: Use SOMENTE ${profile.protein_preference || 'a proteina escolhida'} como fonte proteica. NUNCA use ${excludedProteinsPrompt || 'outras proteinas'}`

  const prompt = `Voce e uma nutricionista especializada em jejum intermitente para mulheres na menopausa. Crie um plano personalizado de jejum intermitente ${ratio.label} com 7 dias.

Dados da paciente:
- Nome: ${sanitizedName}
- Idade: ${profile.age}
- Peso atual: ${profile.weight}kg / Peso desejado: ${profile.target_weight}kg
- Nivel de atividade: ${profile.activity_level}
- Restricoes: ${sanitizedRestrictions || 'nenhuma'}
- NAO come: ${sanitizedFoodsToAvoid || 'nenhuma restricao'}
- ITENS PROIBIDOS (alergia/intolerancia): ${foodsToAvoidPrompt || 'nenhum informado'}
${proteinPromptSection}

REGRAS:
- Trate "ITENS PROIBIDOS" como alergia grave. NUNCA cite, sugira ou inclua esses alimentos
- NUNCA sugira alimentos de "NAO come"
${proteinRuleSection}
- Use APENAS ingredientes comuns no Brasil
- Use o nome ${sanitizedName} nos textos motivacionais
- Tom acolhedor e motivador. Portugues brasileiro.
- NAO faca claims medicos ("cura", "garante perda de peso", "autofagia", "cetose")

FORMATO: Responda APENAS com JSON valido. Sem markdown, sem explicacoes, sem texto antes ou depois. Estrutura exata:
{
  "summary": "Resumo motivacional personalizado (2-3 frases)",
  "tips": ["dica 1", "dica 2", "dica 3"],
  "days": [
    {
      "day": 1,
      "title": "Titulo motivacional do dia",
      "meals": {
        "breakfast": { "name": "Nome da refeicao", "desc": "Descricao detalhada com ingredientes", "kcal": 380 },
        "lunch": { "name": "Nome da refeicao", "desc": "Descricao detalhada com ingredientes", "kcal": 420 },
        "dinner": { "name": "Nome da refeicao", "desc": "Descricao detalhada com ingredientes", "kcal": 320 }
      },
      "hydration": { "water": "2L", "tea": "Cha verde", "tip": "Dica de hidratacao" },
      "exercise": { "name": "Nome do exercicio", "desc": "Descricao do exercicio" },
      "tip": "Dica do dia",
      "motivation": "Frase motivacional personalizada"
    }
  ]
}
IMPORTANTE: O array "days" deve ter EXATAMENTE 7 objetos (day 1 a 7). Cada refeicao deve ter kcal realista. Varie as refeicoes entre os dias.`

  let attempts = 0
  const maxAttempts = 3
  let lastError: string | null = null

  while (attempts < maxAttempts) {
    attempts++
    try {
      const result = await getGeminiModel().generateContent(prompt)
      const rawContent = result.response.text()

      if (!rawContent || rawContent.trim().length < 50) {
        lastError = 'empty_response'
        logger.warn({ attempt: attempts }, 'Gemini returned empty/short response')
        continue
      }

      // Parse and validate JSON structure with Zod
      let content: string
      try {
        const jsonStr = stripCodeFences(rawContent)
        const parsed = aiPlanSchema.parse(JSON.parse(jsonStr))
        content = JSON.stringify(parsed)
      } catch (parseErr) {
        lastError = `json_validation_failed: ${parseErr instanceof Error ? parseErr.message : 'invalid JSON'}`
        logger.warn({ attempt: attempts, error: lastError }, 'AI output JSON/Zod validation failed')
        continue
      }

      // Validate food/protein restrictions on the serialized content
      const validation = validateAIOutput(
        content,
        allFoodsToValidate
      )

      if (!validation.valid) {
        lastError = `validation_failed: ${validation.issues.join(', ')}`
        logger.warn(
          { issues: validation.issues, attempt: attempts },
          'AI output food validation failed'
        )
        continue
      }

      // Save plan via upsert (requires UNIQUE constraint on user_id)
      const regenCount =
        existingPlan &&
        new Date(existingPlan.last_regenerated_at || 0).toDateString() ===
          new Date().toDateString()
          ? existingPlan.regenerations_today + 1
          : 1

      const { error: upsertError } = await supabase
        .from('ai_plans')
        .upsert({
          user_id: user.id,
          plan_content: content,
          regenerations_today: regenCount,
          last_regenerated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (upsertError) {
        logger.error({ upsertError }, 'Failed to upsert ai_plan')
        return NextResponse.json(
          { error: 'Erro ao salvar plano' },
          { status: 500 }
        )
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

  // All AI attempts failed — use deterministic safe fallback (never return 500)
  logger.warn({ lastError, totalAttempts: attempts, userId: user.id }, 'AI failed 3x — using safe fallback plan')

  const fallbackContent = JSON.stringify(buildSafeFallbackPlan({
    dietary_restrictions: profile.dietary_restrictions,
    protein_preference: profile.protein_preference,
    foods_to_avoid: profile.foods_to_avoid,
    name: profile.name,
  }))

  const lastRegen = new Date(existingPlan?.last_regenerated_at || 0)
  const isToday = lastRegen.toDateString() === new Date().toDateString()
  const regenCount = existingPlan && isToday ? existingPlan.regenerations_today + 1 : 1

  const { error: fallbackUpsertError } = await supabase
    .from('ai_plans')
    .upsert({
      user_id: user.id,
      plan_content: fallbackContent,
      regenerations_today: regenCount,
      last_regenerated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (fallbackUpsertError) {
    logger.error({ fallbackUpsertError }, 'Failed to upsert fallback plan')
    return NextResponse.json(
      { error: 'Erro ao salvar plano' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    plan_content: fallbackContent,
    regenerations_today: regenCount,
    fallback: true,
  })
}
