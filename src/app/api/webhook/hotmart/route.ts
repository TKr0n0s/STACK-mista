import { NextRequest, NextResponse } from 'next/server'
import { verifyHotmartWebhook } from '@/lib/hotmart/verify'
import { createAdminClient } from '@/lib/supabase/admin'
import { hotmartWebhookLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  // Rate limit
  const { success } = await hotmartWebhookLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Verify HOTTOK
  const hottok = request.headers.get('X-HOTMART-HOTTOK')
  if (!verifyHotmartWebhook(hottok)) {
    logger.warn({ ip }, 'Invalid Hotmart webhook HOTTOK')
    return NextResponse.json({}, { status: 401 })
  }

  try {
    const payload = await request.json()
    const email = payload?.data?.buyer?.email?.toLowerCase().trim()
    const transactionId = payload?.data?.purchase?.transaction
    const purchaseStatus = payload?.data?.purchase?.status

    if (!email || !transactionId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    // Only process approved purchases
    if (purchaseStatus !== 'approved' && purchaseStatus !== 'APPROVED') {
      logger.info({ status: purchaseStatus, transactionId }, 'Hotmart webhook ignored (not approved)')
      return NextResponse.json({ success: true })
    }

    const supabase = createAdminClient()

    // Sanitize webhook payload to remove PII (addresses, phone, documents, full names)
    // Keep only essential fields: transaction ID, product/purchase info, email, status
    const sanitizedPayload = {
      transaction: payload?.data?.purchase?.transaction,
      product_id: payload?.data?.product?.id,
      product_name: payload?.data?.product?.name,
      purchase_status: payload?.data?.purchase?.status,
      buyer_email: payload?.data?.buyer?.email,
      source: 'hotmart',
      webhook_received_at: new Date().toISOString(),
    }

    // Idempotent insert: insert only once, don't overwrite existing records (A5)
    const { error } = await supabase.from('purchase_activations').insert({
      email,
      transaction_id: transactionId,
      status: 'pending',
      webhook_payload: sanitizedPayload,
    })

    // Handle duplicate webhook (error code 23505 = unique constraint violation)
    if (error) {
      if (error.code === '23505') {
        logger.info({ transactionId }, 'Duplicate webhook received (idempotent)')
        return NextResponse.json({ success: true })
      }

      logger.error({ error, transactionId }, 'Failed to save activation')
      return NextResponse.json(
        { error: 'Internal error' },
        { status: 500 }
      )
    }

    logger.info({ transactionId }, 'Hotmart webhook processed')
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, 'Hotmart webhook error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
