import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const weekNumber = body.week_number as number

  if (!weekNumber || weekNumber < 2) {
    return NextResponse.json(
      { error: 'Invalid week number' },
      { status: 400 }
    )
  }

  // Soft gate: use SQL function to check if user can access week
  const { data: canAccess, error: rpcError } = await supabase.rpc(
    'can_access_week',
    { p_user_id: user.id, p_week: weekNumber }
  )

  if (rpcError) {
    return NextResponse.json(
      { error: 'Failed to check week access: ' + rpcError.message },
      { status: 500 }
    )
  }

  const recommended = canAccess === true

  // Update current week (allow even if not recommended — soft gate)
  await supabase
    .from('users')
    .update({ current_week: weekNumber })
    .eq('id', user.id)

  return NextResponse.json({
    unlocked: true,
    recommended,
  })
}
