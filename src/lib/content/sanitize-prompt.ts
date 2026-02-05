/**
 * Sanitizes user input to prevent prompt injection attacks.
 * Removes special characters and newlines, enforces length limits.
 *
 * @param str Input string to sanitize
 * @param maxLen Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizePromptInput(str: string, maxLen: number): string {
  if (!str || typeof str !== 'string') {
    return ''
  }

  // Remove newlines and carriage returns
  let sanitized = str.replace(/[\n\r]/g, ' ')

  // Allow only:
  // - Letters (a-z, A-Z) and accented Portuguese characters (á, é, í, ó, ú, ã, õ, etc.)
  // - Numbers (0-9)
  // - Spaces
  // - Commas, periods, and hyphens
  // Using comprehensive character class for Portuguese/accented characters
  sanitized = sanitized.replace(
    /[^a-zA-Zàáâãäåèéêëìíîïòóôõöùúûüýÿñçœæ0-9\s,.\-]/g,
    ''
  )

  // Collapse multiple spaces into one
  sanitized = sanitized.replace(/\s+/g, ' ')

  // Trim whitespace
  sanitized = sanitized.trim()

  // Enforce maximum length
  if (sanitized.length > maxLen) {
    sanitized = sanitized.substring(0, maxLen).trim()
  }

  return sanitized
}
