import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DEV ONLY — remove before deploy
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'davidbksantos@gmail.com',
    password: 'teste123456',
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'http://localhost:3000' : 'http://localhost:3000'))
}
