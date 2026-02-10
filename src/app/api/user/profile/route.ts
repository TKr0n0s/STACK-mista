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
})

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

  // First, try to get existing user to preserve email
  const { data: existingUser } = await supabase
    .from('users')
    .select('email')
    .eq('id', user.id)
    .single()

  const userEmail = existingUser?.email || user.email || ''

  if (!userEmail) {
    logger.error({ userId: user.id }, 'Profile update: No email found')
    return NextResponse.json(
      { error: 'Email do usuário não encontrado' },
      { status: 400 }
    )
  }

  // Use upsert to handle user creation or update (A6)
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        email: userEmail,
        ...parsed.data,
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (error) {
    logger.error({ userId: user.id, error }, 'Profile update error')
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar perfil' },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
