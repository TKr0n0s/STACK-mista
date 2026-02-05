import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TEST_EMAIL = 'admin@queimaintermitente.com'
const TEST_PASSWORD = 'admin123'

/**
 * DEV ONLY - Creates an admin user with email/password.
 * POST /api/dev/seed-login
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const supabase = createAdminClient()

  try {
    // Try to create auth user with password
    const { data: createData, error: createError } =
      await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
      })

    let userId: string

    if (createError) {
      // User might already exist — try to list and find
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users?.find((u) => u.email === TEST_EMAIL)

      if (existing) {
        userId = existing.id
        // Update password in case it changed
        await supabase.auth.admin.updateUserById(userId, {
          password: TEST_PASSWORD,
        })
      } else {
        return NextResponse.json(
          { error: 'Failed to create user', details: createError.message },
          { status: 500 }
        )
      }
    } else {
      userId = createData.user.id
    }

    // Insert into public.users (ignore if exists)
    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      email: TEST_EMAIL,
      name: 'Admin',
      fasting_start_hour: 20,
      fasting_end_hour: 12,
      current_week: 1,
      profile_completed: true,
    })

    if (insertError && insertError.code !== '23505') {
      return NextResponse.json(
        { error: 'Failed to insert user', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      user_id: userId,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal error', details: String(err) },
      { status: 500 }
    )
  }
}
