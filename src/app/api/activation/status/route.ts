import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { activationStatusLimiter } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  // Rate limit: 10 req/min per IP to prevent email enumeration (A8)
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { success } = await activationStatusLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const supabase = createAdminClient()

  const { data } = await supabase
    .from('purchase_activations')
    .select('status')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // If no record found: return { status: 'pending' } - hide that account exists (A8)
  if (!data) {
    return NextResponse.json({ status: 'pending' })
  }

  // Map internal statuses to external ones
  // - 'pending' and 'otp_sent' → 'ready' (user can request/verify OTP)
  // - 'activated' → 'pending' (hide that account exists, account already activated)
  // - 'failed' → 'pending' (hide that account failed verification)
  const statusMap: Record<string, string> = {
    pending: 'ready',
    otp_sent: 'ready',
    activated: 'pending', // Hide activated status
    failed: 'pending', // Hide failed status
  }

  return NextResponse.json({ status: statusMap[data.status] || 'pending' })
}
