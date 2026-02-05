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

  // Try with the provided type first, then fallback to 'email'
  let error = null
  const { error: err1 } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })

  if (err1) {
    // Try with 'email' type as fallback
    const { error: err2 } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: tokenHash,
    })
    error = err2
  }

  if (error) {
    console.error('Magic link verification error:', error)
    return NextResponse.redirect(new URL('/login?error=link_expired', request.url))
  }

  // Successfully authenticated
  return NextResponse.redirect(new URL(next, request.url))
}
