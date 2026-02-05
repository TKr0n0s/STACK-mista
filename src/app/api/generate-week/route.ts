import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGeminiJsonModel } from '@/lib/gemini'
import { validateAIOutput } from '@/lib/content/medical-claims'
import { sanitizePromptInput } from '@/lib/content/sanitize-prompt'
import { aiRateLimiter } from '@/lib/rate-limit'
import { SchemaType, type ResponseSchema } from '@google/generative-ai'

const weekSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    days: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day: { type: SchemaType.NUMBER },
          title: { type: SchemaType.STRING },
          breakfast_name: { type: SchemaType.STRING },
          breakfast_desc: { type: SchemaType.STRING },
          lunch_name: { type: SchemaType.STRING },
          lunch_desc: { type: SchemaType.STRING },
          dinner_name: { type: SchemaType.STRING },
          dinner_desc: { type: SchemaType.STRING },
          water_target: { type: SchemaType.STRING },
          tea_name: { type: SchemaType.STRING },
          tea_tip: { type: SchemaType.STRING },
          exercise_name: { type: SchemaType.STRING },
          exercise_desc: { type: SchemaType.STRING },
          tip_of_day: { type: SchemaType.STRING },
          did_you_know: { type: SchemaType.STRING },
          motivation: { type: SchemaType.STRING },
        },
        required: [
          'day',
          'title',
          'breakfast_name',
          'breakfast_desc',
          'lunch_name',
          'lunch_desc',
          'dinner_name',
          'dinner_desc',
          'exercise_name',
          'exercise_desc',
          'tip_of_day',
          'motivation',
        ],
      },
    },
  },
  required: ['days'],
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = await aiRateLimiter.limit(user.id)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const weekNumber = body.week_number as number

  if (!weekNumber || weekNumber < 2) {
    return NextResponse.json(
      { error: 'Week number must be >= 2' },
      { status: 400 }
    )
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
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

  const foodsToAvoid = profile.foods_to_avoid
    ? profile.foods_to_avoid.split(',').map((f: string) => f.trim())
    : []

  const prompt = `Voce e uma nutricionista especializada em jejum intermitente para mulheres na menopausa.
Crie 7 dias de refeicoes para ${sanitizedName}, Semana ${weekNumber}.

Perfil:
- Idade: ${profile.age || 'nao informada'}
- Peso: ${profile.weight || 'nao informado'}kg / Meta: ${profile.target_weight || 'nao informado'}kg
- Atividade: ${profile.activity_level || 'nao informado'}
- Restricoes: ${sanitizedRestrictions || 'nenhuma'}
- NAO come: ${sanitizedFoodsToAvoid || 'nada especificado'}
- Proteina preferida: ${profile.protein_preference || 'variada'}

REGRAS OBRIGATORIAS:
- NUNCA sugira alimentos de "NAO come"
- Use APENAS ingredientes comuns no Brasil
- Use o nome ${sanitizedName} nas motivacoes
- Tom acolhedor. Portugues brasileiro.
- NAO faca claims medicos ("cura", "garante perda de peso", "autofagia", "cetose")
- Evolua a dificuldade dos exercicios gradualmente
- Varie as refeicoes (nao repita)

Para cada dia gere: title, 3 refeicoes (name + desc), hidratacao (water_target, tea_name, tea_tip), exercicio (name + desc), tip_of_day, did_you_know, motivation.`

  const model = getGeminiJsonModel(weekSchema)
  let lastError: Error | null = null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = JSON.parse(text)

      // Validate content safety
      const fullContent = JSON.stringify(parsed)
      const validation = validateAIOutput(fullContent, foodsToAvoid)

      if (!validation.valid) {
        lastError = new Error(`Content validation failed: ${validation.issues.join(', ')}`)
        continue
      }

      // Save days to database
      const days = parsed.days.map(
        (d: Record<string, unknown>) => {
          const { day, ...rest } = d as Record<string, unknown> & { day: number }
          return {
            ...rest,
            day_number: day,
            user_id: user.id,
            week_number: weekNumber,
            source: 'generated' as const,
          }
        }
      )

      const { error: insertError } = await supabase.from('days').upsert(days, {
        onConflict: 'user_id,week_number,day_number',
      })

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, days: parsed.days })
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  return NextResponse.json(
    { error: lastError?.message || 'AI generation failed after 3 attempts' },
    { status: 500 }
  )
}
