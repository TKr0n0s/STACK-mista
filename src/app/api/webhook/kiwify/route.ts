import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { kiwifyWebhookLimiter } from '@/lib/rate-limit'
import { verifyKiwifyWebhook } from '@/lib/kiwify/verify'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  // Rate limit
  const { success } = await kiwifyWebhookLimiter.limit(ip)
  if (!success) {
    logger.warn({ ip }, 'Kiwify webhook rate limited')
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Read raw body
  const rawBody = await request.text()

  // Parse JSON
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    logger.warn({ ip }, 'Invalid JSON in Kiwify webhook')
    return NextResponse.json({}, { status: 400 })
  }

  // Webhook signature verification
  const signature = request.headers.get('signature')
  const secret = process.env.KIWIFY_WEBHOOK_SECRET
  const bodyToken = (payload.token || payload.Token || null) as string | null

  if (secret) {
    const isValid = verifyKiwifyWebhook(rawBody, signature, secret, bodyToken)
    if (!isValid) {
      logger.warn({ ip, hasSignature: !!signature, hasBodyToken: !!bodyToken }, 'Kiwify webhook signature verification FAILED')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    logger.info({}, 'Kiwify webhook signature verified')
  } else {
    logger.warn({}, 'KIWIFY_WEBHOOK_SECRET not set — accepting without verification (configure in production!)')
  }

  try {
    const orderStatus = payload.order_status as string | undefined

    // Accept "paid" (confirmed from Kiwify docs) plus defensive alternatives
    if (orderStatus !== 'paid' && orderStatus !== 'approved' && orderStatus !== 'completed') {
      logger.info(
        { order_status: orderStatus, order_id: payload.order_id },
        'Kiwify webhook ignored (not a paid status)'
      )
      return NextResponse.json({ success: true })
    }

    // Extract customer data from multiple possible paths
    const customerObj = (payload.Customer || payload.customer) as Record<string, unknown> | undefined
    const email = (
      customerObj?.email as string ||
      payload.email as string ||
      ''
    ).toLowerCase().trim()

    const name = (customerObj?.full_name || customerObj?.name || '') as string
    const orderId = (payload.order_id || payload.orderId || payload.id || '') as string

    if (!email || !orderId) {
      logger.error(
        { hasEmail: !!email, hasOrderId: !!orderId },
        'Kiwify webhook missing email or orderId'
      )
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const sanitizedPayload = {
      order_id: orderId,
      product_id: payload.product_id || (payload.Product as Record<string, unknown>)?.product_id || (payload.product as Record<string, unknown>)?.id,
      product_name: payload.product_name || (payload.Product as Record<string, unknown>)?.product_name || (payload.product as Record<string, unknown>)?.name,
      order_status: orderStatus,
      customer_email: email,
      source: 'kiwify',
      webhook_received_at: new Date().toISOString(),
    }

    // Idempotent insert
    const { error } = await supabase.from('purchase_activations').insert({
      email,
      transaction_id: orderId,
      status: 'pending',
      webhook_payload: sanitizedPayload,
    })

    if (error) {
      if (error.code === '23505') {
        logger.info({ orderId }, 'Duplicate Kiwify webhook (idempotent)')
        return NextResponse.json({ success: true })
      }

      logger.error({ error, orderId, email: email.slice(0, 3) + '***' }, 'Failed to save Kiwify activation')
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    logger.info(
      { orderId, email: email.slice(0, 3) + '***' },
      'Kiwify purchase saved successfully'
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, 'Kiwify webhook error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
