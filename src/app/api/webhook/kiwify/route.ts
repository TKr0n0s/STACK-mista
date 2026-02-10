import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { kiwifyWebhookLimiter } from '@/lib/rate-limit'
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

  // Log ALL headers for debugging (which ones does Kiwify actually send?)
  const headerEntries: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    if (!key.startsWith('x-vercel') && key !== 'cookie') {
      headerEntries[key] = key.toLowerCase().includes('auth') ? '***' : value
    }
  })
  logger.info({ headers: headerEntries, bodyLength: rawBody.length }, 'Kiwify webhook received - headers')

  // Log raw body (truncated for safety)
  logger.info(
    { rawBody: rawBody.slice(0, 1000) },
    'Kiwify webhook received - body'
  )

  // Parse JSON
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    logger.warn({ ip, rawBody: rawBody.slice(0, 200) }, 'Invalid JSON in Kiwify webhook')
    return NextResponse.json({}, { status: 400 })
  }

  // Log parsed payload top-level keys
  logger.info(
    { keys: Object.keys(payload), order_status: payload.order_status, order_id: payload.order_id },
    'Kiwify webhook parsed - top-level keys'
  )

  // Token verification - LOG but ACCEPT ALL for now (we need to see what Kiwify actually sends)
  const signature = request.headers.get('signature')
  const secret = process.env.KIWIFY_WEBHOOK_SECRET
  const bodyToken = (payload.token || payload.Token || null) as string | null

  logger.info(
    {
      hasSecret: !!secret,
      hasSignatureHeader: !!signature,
      hasBodyToken: !!bodyToken,
      signatureHeader: signature?.slice(0, 10),
      bodyTokenValue: bodyToken?.slice(0, 5),
    },
    'Kiwify webhook token check (accepting all for debugging)'
  )

  try {
    // Log the order_status value to understand what Kiwify sends
    const orderStatus = payload.order_status as string | undefined
    logger.info(
      { order_status: orderStatus, order_id: payload.order_id },
      'Kiwify webhook order_status check'
    )

    // Accept "paid" (confirmed from Kiwify docs) plus defensive alternatives
    if (orderStatus !== 'paid' && orderStatus !== 'approved' && orderStatus !== 'completed') {
      logger.info(
        { order_status: orderStatus, order_id: payload.order_id },
        'Kiwify webhook ignored (not a paid status)'
      )
      return NextResponse.json({ success: true })
    }

    // Try multiple possible email paths (we're not 100% sure of Kiwify's structure)
    const customerObj = (payload.Customer || payload.customer) as Record<string, unknown> | undefined
    const email = (
      customerObj?.email as string ||
      payload.email as string ||
      ''
    ).toLowerCase().trim()

    const name = (customerObj?.full_name || customerObj?.name || '') as string
    const orderId = (payload.order_id || payload.orderId || payload.id || '') as string

    logger.info(
      {
        email: email ? email.slice(0, 3) + '***@' + email.split('@')[1] : 'EMPTY',
        name: name ? name.slice(0, 3) + '***' : 'EMPTY',
        orderId: orderId || 'EMPTY',
        customerKeys: customerObj ? Object.keys(customerObj) : 'NO_CUSTOMER_OBJ',
      },
      'Kiwify webhook customer data extracted'
    )

    if (!email || !orderId) {
      logger.error(
        {
          hasEmail: !!email,
          hasOrderId: !!orderId,
          payloadKeys: Object.keys(payload),
        },
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
