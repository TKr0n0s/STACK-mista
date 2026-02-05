import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies Kiwify webhook signature using HMAC-SHA256
 * @param rawBody - Raw request body string
 * @param signature - Signature from 'signature' header
 * @param secret - KIWIFY_WEBHOOK_SECRET from environment
 * @returns true if signature is valid
 */
export function verifyKiwifyWebhook(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false

  try {
    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    // Length check before timing-safe comparison
    if (signature.length !== expectedSignature.length) return false

    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}
