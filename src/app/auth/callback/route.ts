import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'magiclink' | 'recovery' | 'email'
  const next = searchParams.get('next') ?? '/dashboard'

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (error) {
    console.error('Magic link verification error:', error)
    return NextResponse.redirect(new URL('/login?error=link_expired', request.url))
  }

  // Successfully authenticated
  return NextResponse.redirect(new URL(next, request.url))
}
