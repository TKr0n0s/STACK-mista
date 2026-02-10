import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

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

    logger.error({ error }, 'Code exchange error')
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
      logger.info({ type: 'magiclink' }, 'Magic link verified successfully')
      return NextResponse.redirect(new URL(next, origin))
    }

    logger.error({ error: err1.message }, 'Magiclink verification failed')

    // Try email type as fallback
    const { error: err2 } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: tokenHash,
    })

    if (!err2) {
      logger.info({ type: 'email' }, 'Email OTP verified successfully')
      return NextResponse.redirect(new URL(next, origin))
    }

    logger.error({ error: err2.message }, 'Email verification failed')

    // Try recovery type
    const { error: err3 } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    })

    if (!err3) {
      return NextResponse.redirect(new URL(next, origin))
    }

    logger.error({ attempts: ['magiclink', 'email', 'recovery'] }, 'All verification attempts failed')
    return NextResponse.redirect(new URL('/login?error=link_expired', origin))
  }

  // No valid parameters
  return NextResponse.redirect(new URL('/login?error=invalid_link', origin))
}
