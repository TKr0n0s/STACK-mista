import { timingSafeEqual } from 'crypto'

export function verifyHotmartWebhook(hottok: string | null): boolean {
  if (!hottok || !process.env.HOTMART_HOTTOK) return false

  // Use timing-safe comparison to prevent timing attacks
  try {
    const expectedToken = process.env.HOTMART_HOTTOK

    // Ensure both buffers have the same length before comparing
    if (Buffer.byteLength(hottok) !== Buffer.byteLength(expectedToken)) {
      return false
    }

    return timingSafeEqual(
      Buffer.from(hottok),
      Buffer.from(expectedToken)
    )
  } catch {
    // Return false if comparison fails (length mismatch, etc.)
    return false
  }
}
