import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // Delete auth user FIRST
    const { error: authError } = await admin.auth.admin.deleteUser(user.id)

    if (authError) {
      console.error('Auth user deletion failed:', authError)
      return NextResponse.json(
        { error: 'Failed to delete account: ' + authError.message },
        { status: 500 }
      )
    }

    // CASCADE in schema.sql handles deletion of public.users and all related tables
    // No need to manually delete from public.users
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err)
    return NextResponse.json(
      { error: 'Internal server error during account deletion' },
      { status: 500 }
    )
  }
}
