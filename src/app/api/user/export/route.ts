import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      'Content-Disposition': `attachment; filename="queima-intermitente-dados-${user.id}.json"`,
    },
  })
}
