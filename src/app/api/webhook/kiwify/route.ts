import { NextRequest, NextResponse } from 'next/server'
import { verifyKiwifyWebhook } from '@/lib/kiwify/verify'
import { createAdminClient } from '@/lib/supabase/admin'
import { kiwifyWebhookLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  // Rate limit
  const { success } = await kiwifyWebhookLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Get raw body for signature verification
  const rawBody = await request.text()
  const signature = request.headers.get('signature')
  const secret = process.env.KIWIFY_WEBHOOK_SECRET

  if (!secret || !verifyKiwifyWebhook(rawBody, signature, secret)) {
    logger.warn({ ip }, 'Invalid Kiwify webhook signature')
    return NextResponse.json({}, { status: 401 })
  }

  try {
    const payload = JSON.parse(rawBody)

    // Kiwify envia "order_status": "paid" para compras aprovadas
    if (payload.order_status !== 'paid') {
      // Ignorar outros eventos (refund, pending, etc)
      return NextResponse.json({ success: true })
    }

    const email = payload.Customer?.email
    const name = payload.Customer?.full_name
    const orderId = payload.order_id

    if (!email || !orderId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Idempotent insert - prevent duplicates
    const { error } = await supabase.from('purchase_activations').insert({
      email,
      transaction_id: orderId,
      status: 'pending',
      webhook_payload: { ...payload, source: 'kiwify', buyer_name: name },
    })

    // Handle duplicate webhook (unique constraint violation)
    if (error) {
      if (error.code === '23505') {
        logger.info({ orderId }, 'Duplicate Kiwify webhook (idempotent)')
        return NextResponse.json({ success: true })
      }

      logger.error({ error, orderId }, 'Failed to save Kiwify activation')
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    // Log with masked email for privacy
    logger.info(
      { orderId, email: email.slice(0, 3) + '***' },
      'Kiwify purchase processed'
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, 'Kiwify webhook error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
