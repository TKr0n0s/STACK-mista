import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify LGPD consent before allowing export (Art. 18)
  const { data: consent } = await supabase
    .from('user_consents')
    .select('id, consent_given')
    .eq('user_id', user.id)
    .single()

  if (!consent?.consent_given) {
    logger.warn({ userId: user.id }, 'Data export attempted without LGPD consent')
    return NextResponse.json(
      { error: 'Consentimento obrigatório para exportação de dados' },
      { status: 403 }
    )
  }

  // Fetch all user data in parallel
  const [profile, plans, days, progress, reflections, consents] =
    await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('ai_plans').select('*').eq('user_id', user.id),
      supabase.from('days').select('*').eq('user_id', user.id),
      supabase.from('daily_progress').select('*').eq('user_id', user.id),
      supabase.from('weekly_reflections').select('*').eq('user_id', user.id),
      supabase.from('user_consents').select('*').eq('user_id', user.id),
    ])

  const exportData = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    profile: profile.data,
    ai_plans: plans.data,
    days: days.data,
    daily_progress: progress.data,
    weekly_reflections: reflections.data,
    consents: consents.data,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="sempre-magras-dados-${user.id}.json"`,
    },
  })
}
