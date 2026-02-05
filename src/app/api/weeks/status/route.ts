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

  // Get current week from user profile
  const { data: profile } = await supabase
    .from('users')
    .select('current_week')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Get completion counts per week
  const { data: progress } = await supabase
    .from('daily_progress')
    .select('week, completed')
    .eq('user_id', user.id)
    .eq('completed', true)

  const weekCompletions: Record<number, number> = {}
  for (const p of progress || []) {
    weekCompletions[p.week] = (weekCompletions[p.week] || 0) + 1
  }

  return NextResponse.json({
    current_week: profile.current_week,
    week_completions: weekCompletions,
  })
}
