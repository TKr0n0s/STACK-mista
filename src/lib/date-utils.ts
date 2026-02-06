/**
 * Timezone-consistent date utilities for streak and progress tracking.
 * All functions use local time (not UTC) to ensure consistent behavior across timezones.
 */

/**
 * Get today's date as YYYY-MM-DD in local timezone.
 * This is the canonical date key used throughout the app for tracking daily metrics.
 */
export function getTodayKey(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get the day of week in local timezone (1=Monday, 7=Sunday).
 * This is the ISO 8601 standard format.
 */
export function getDayOfWeekLocal(): number {
  const day = new Date().getDay()
  return day === 0 ? 7 : day // Convert Sunday from 0 to 7
}
