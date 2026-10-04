/*
 * Client-side validation rules. They mirror the CHECK constraints in
 * supabase/migrations — the database is the authority, this is for fast,
 * friendly feedback.
 */

export const LIMITS = {
  name: { min: 2, max: 120 },
  company: { max: 160 },
  email: { max: 254 },
  message: { min: 10, max: 4000 },
} as const

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const HTTP_URL = /^https?:\/\/\S+$/i

export function isEmail(value: string): boolean {
  return value.length <= LIMITS.email.max && EMAIL.test(value)
}

export function isHttpUrl(value: string): boolean {
  if (!HTTP_URL.test(value) || value.length > 2048) return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/** Trims the value and converts an empty string to null (for nullable columns). */
export function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
