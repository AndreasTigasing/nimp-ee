import type { Session } from '@supabase/supabase-js'
import { AppError, toAppError } from '@/lib/errors'
import { getPublicApi, getSupabase } from '@/lib/supabase'
import { unwrap } from './helpers'

export type { Session }

/** Signs in with Supabase Auth. Throws AppError("unauthorized") for wrong credentials. */
export async function signIn(email: string, password: string): Promise<Session> {
  const supabase = await getSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Supabase reports wrong credentials as HTTP 400 "invalid_credentials".
    if (error.status === 400 || error.code === 'invalid_credentials') {
      throw new AppError('unauthorized', 'invalid_credentials', { cause: error })
    }
    throw toAppError(error)
  }
  return data.session
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw toAppError(error)
}

export async function getSession(): Promise<Session | null> {
  const supabase = await getSupabase()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw toAppError(error)
  return data.session
}

/**
 * Subscribes to sign-in / sign-out / token refresh events.
 * Returns the unsubscribe function.
 */
export async function onSessionChange(
  listener: (session: Session | null) => void,
): Promise<() => void> {
  const supabase = await getSupabase()
  const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(session))
  return () => data.subscription.unsubscribe()
}

/**
 * Asks the database whether the signed-in user is an admin. This only decides
 * what the UI shows — the actual protection is Row Level Security.
 */
export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await getSupabase()
  return unwrap(await supabase.rpc('is_admin'))
}

// ── First-run setup ───────────────────────────────────────────────────────

/** True while the site has no admin yet (the quick setup should be shown). */
export async function isSetupRequired(): Promise<boolean> {
  return unwrap(await getPublicApi().rpc('setup_required'))
}

export type AccountResult =
  /** Signed in with the given credentials (new or existing account). */
  | 'signed-in'
  /** The account exists but its e-mail address has not been confirmed yet. */
  | 'confirmation-required'

/**
 * Creates the account or, if it already exists, signs in with it. Throws
 * AppError("validation") with the message "signup_disabled" / "weak_password"
 * and AppError("unauthorized") when an existing account's password is wrong.
 */
export async function createOrSignIn(email: string, password: string): Promise<AccountResult> {
  const supabase = await getSupabase()

  const signUp = await supabase.auth.signUp({ email, password })
  if (!signUp.error && signUp.data.session) return 'signed-in'

  if (
    signUp.error?.code === 'signup_disabled' ||
    signUp.error?.code === 'email_provider_disabled'
  ) {
    throw new AppError('validation', 'signup_disabled', { cause: signUp.error })
  }
  if (signUp.error?.code === 'weak_password') {
    throw new AppError('validation', 'weak_password', { cause: signUp.error })
  }

  // No session: the address is awaiting confirmation, or the account already
  // existed (Supabase does not tell these apart on sign-up). Signing in does.
  const login = await supabase.auth.signInWithPassword({ email, password })
  if (login.data.session) return 'signed-in'
  if (login.error?.code === 'email_not_confirmed') return 'confirmation-required'
  if (!signUp.error) return 'confirmation-required'
  if (login.error?.status === 400) {
    throw new AppError('unauthorized', 'invalid_credentials', { cause: login.error })
  }
  throw toAppError(login.error ?? signUp.error)
}

export type ClaimResult = 'ok' | 'invalid_code' | 'already_done' | 'not_signed_in'

/** Makes the signed-in user the first admin, given the one-time setup code. */
export async function claimFirstAdmin(code: string): Promise<ClaimResult> {
  const supabase = await getSupabase()
  const result = unwrap(await supabase.rpc('claim_first_admin', { code }))
  return result === 'ok' || result === 'invalid_code' || result === 'already_done'
    ? result
    : 'not_signed_in'
}
