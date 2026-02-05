import { Resend } from 'resend'

let _resend: Resend | null = null

/**
 * Get singleton Resend client
 * Throws if RESEND_API_KEY is not configured
 */
export function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not configured')
    }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}
