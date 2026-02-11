import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  age: z.number().int().min(18).max(120).optional(),
  weight: z.number().positive().max(500).optional(),
  target_weight: z.number().positive().max(500).optional(),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active']).optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  foods_to_avoid: z.string().max(500).optional(),
  protein_preference: z.enum(['chicken', 'fish', 'meat', 'eggs', 'legumes']).optional(),
  fasting_start_hour: z.number().int().min(0).max(23).optional(),
  fasting_end_hour: z.number().int().min(0).max(23).optional(),
  profile_completed: z.boolean().optional(),
  program_start_date: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.fasting_start_hour != null && data.fasting_end_hour != null) {
      return data.fasting_start_hour !== data.fasting_end_hour
    }
    return true
  },
  { message: 'Horario de inicio e fim do jejum nao podem ser iguais', path: ['fasting_end_hour'] }
)

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = profileUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Normalize dietary restrictions: PT→EN canonical keys
  if (parsed.data.dietary_restrictions) {
    const ptToEn: Record<string, string> = {
      'vegetariana': 'vegetarian', 'vegana': 'vegan',
      'sem lactose': 'lactose_free', 'sem gluten': 'gluten_free',
    }
    parsed.data.dietary_restrictions = parsed.data.dietary_restrictions.map(r => {
      const n = r.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      return ptToEn[n] || r
    })
  }

  // Check if user row already exists (created during auth/email-login)
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', user.id)
    .maybeSingle()

  const userEmail = existingUser?.email || user.email || ''

  if (!userEmail) {
    logger.error({ userId: user.id }, 'Profile update: No email found')
    return NextResponse.json(
      { error: 'Email do usuário não encontrado' },
      { status: 400 }
    )
  }

  let data, error

  if (existingUser) {
    // User exists: UPDATE only provided fields (no NOT NULL issues)
    const result = await supabase
      .from('users')
      .update(parsed.data)
      .eq('id', user.id)
      .select()
      .single()
    data = result.data
    error = result.error
  } else {
    // User does not exist (edge case): INSERT with all required fields
    const result = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: userEmail,
        name: parsed.data.name || '',
        fasting_start_hour: parsed.data.fasting_start_hour ?? 20,
        fasting_end_hour: parsed.data.fasting_end_hour ?? 12,
        ...parsed.data,
      })
      .select()
      .single()
    data = result.data
    error = result.error
  }

  if (error) {
    logger.error({ userId: user.id, error }, 'Profile update error')
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar perfil' },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
