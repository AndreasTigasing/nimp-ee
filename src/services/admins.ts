import { getSupabase } from '@/lib/supabase'
import type { AdminAccount, AdminInvite } from '@/types/database'
import { assertOk, unwrap } from './helpers'

/*
 * Admin management. Every function here is authorised by the database (the
 * RPCs check the caller); the browser only ever uses the public anon key.
 */

export async function listAdmins(): Promise<AdminAccount[]> {
  const supabase = await getSupabase()
  return unwrap(await supabase.rpc('list_admins'))
}

export type RemoveAdminResult = 'ok' | 'cannot_remove_self' | 'not_found'

/** Takes the admin role away from another admin. Their account itself is kept. */
export async function removeAdmin(userId: string): Promise<RemoveAdminResult> {
  const supabase = await getSupabase()
  const result = unwrap(await supabase.rpc('remove_admin', { target: userId }))
  return result === 'ok' || result === 'cannot_remove_self' ? result : 'not_found'
}

export async function listAdminInvites(): Promise<AdminInvite[]> {
  const supabase = await getSupabase()
  return unwrap(await supabase.rpc('list_admin_invites'))
}

/**
 * Creates a one-time invitation and returns its code. The code is not stored
 * anywhere readable, so it must be shown to the admin right away.
 */
export async function createAdminInvite(email: string | null, validDays: number): Promise<string> {
  const supabase = await getSupabase()
  return unwrap(
    await supabase.rpc('create_admin_invite', { invite_email: email, valid_days: validDays }),
  )
}

export async function revokeAdminInvite(id: string): Promise<void> {
  const supabase = await getSupabase()
  assertOk(await supabase.rpc('revoke_admin_invite', { invite_id: id }))
}

export type AcceptInviteResult = 'ok' | 'invalid_code' | 'expired' | 'wrong_email' | 'not_signed_in'

/** Makes the signed-in user an admin, given a valid invitation code. */
export async function acceptAdminInvite(code: string): Promise<AcceptInviteResult> {
  const supabase = await getSupabase()
  const result = unwrap(await supabase.rpc('accept_admin_invite', { code }))
  return result === 'ok' ||
    result === 'invalid_code' ||
    result === 'expired' ||
    result === 'wrong_email'
    ? result
    : 'not_signed_in'
}
