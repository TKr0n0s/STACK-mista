import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const consentSchema = z.object({
  consent_type: z.enum(['privacy_policy', 'health_data', 'marketing']),
  granted: z.boolean(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = consentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados invalidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const ip = request.headers.get('x-forwarded-for') || null
  const userAgent = request.headers.get('user-agent') || null

  const { error } = await supabase.from('user_consents').insert({
    user_id: user.id,
    consent_type: parsed.data.consent_type,
    granted: parsed.data.granted,
    ip_address: ip,
    user_agent: userAgent,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_consents')
    .select('consent_type, granted, granted_at, revoked_at')
    .eq('user_id', user.id)
    .order('granted_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
