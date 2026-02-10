import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies Kiwify webhook signature using multiple methods
 * Supports: HMAC-SHA256, direct token comparison (header), direct token comparison (body)
 *
 * @param rawBody - Raw request body string
 * @param signature - Signature from 'signature' header (optional)
 * @param secret - KIWIFY_WEBHOOK_SECRET from environment
 * @param bodyToken - Token from JSON body (optional, fallback method)
 * @returns true if any verification method succeeds
 */
export function verifyKiwifyWebhook(
  rawBody: string,
  signature: string | null,
  secret: string,
  bodyToken?: string | null
): boolean {
  if (!secret) return false

  try {
    // Method 1: HMAC-SHA256 verification (signature header)
    if (signature) {
      const expectedSignature = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')

      // Length check before timing-safe comparison
      if (signature.length === expectedSignature.length) {
        if (timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature)
        )) {
          return true
        }
      }

      // Method 2: Direct token comparison (signature header === secret)
      if (signature.length === secret.length) {
        if (timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(secret)
        )) {
          return true
        }
      }
    }

    // Method 3: Direct token comparison (body token === secret)
    if (bodyToken && bodyToken.length === secret.length) {
      if (timingSafeEqual(
        Buffer.from(bodyToken),
        Buffer.from(secret)
      )) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}
