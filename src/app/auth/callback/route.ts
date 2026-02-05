import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = searchParams.get('next') ?? '/dashboard'

  // Handle code exchange (from Supabase PKCE flow)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }

    console.error('Code exchange error:', error)
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
  }

  // Handle token_hash (from our magic link flow)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (tokenHash) {
    const supabase = await createClient()

    // Try magiclink type first (most common)
    const { error: err1 } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    })

    if (!err1) {
      console.log('Magic link verified successfully')
      return NextResponse.redirect(new URL(next, origin))
    }

    console.error('Magiclink verification failed:', err1.message)

    // Try email type as fallback
    const { error: err2 } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: tokenHash,
    })

    if (!err2) {
      console.log('Email OTP verified successfully')
      return NextResponse.redirect(new URL(next, origin))
    }

    console.error('Email verification failed:', err2.message)

    // Try recovery type
    const { error: err3 } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    })

    if (!err3) {
      return NextResponse.redirect(new URL(next, origin))
    }

    console.error('All verification attempts failed')
    return NextResponse.redirect(new URL('/login?error=link_expired', origin))
  }

  // No valid parameters
  return NextResponse.redirect(new URL('/login?error=invalid_link', origin))
}
