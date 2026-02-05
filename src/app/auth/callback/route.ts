import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl

  // Handle code exchange (from email link via Supabase)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }

    console.error('Code exchange error:', error)
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
  }

  // Handle token_hash (legacy/manual flow)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'magiclink' | 'recovery' | 'email' | 'signup'

  if (tokenHash && type) {
    const supabase = await createClient()

    // Try verification with provided type
    const { error: err1 } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (!err1) {
      return NextResponse.redirect(new URL(next, origin))
    }

    // Fallback to 'email' type
    const { error: err2 } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: tokenHash,
    })

    if (!err2) {
      return NextResponse.redirect(new URL(next, origin))
    }

    console.error('Token verification error:', err1, err2)
    return NextResponse.redirect(new URL('/login?error=link_expired', origin))
  }

  // No code or token_hash - invalid request
  return NextResponse.redirect(new URL('/login?error=invalid_link', origin))
}
