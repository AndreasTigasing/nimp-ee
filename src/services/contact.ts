import { getPublicApi, getSupabase } from '@/lib/supabase'
import type { ContactSubmission, ContactSubmissionInput, SubmissionStatus } from '@/types/database'
import { assertOk, unwrap, unwrapCount } from './helpers'

// ── Public ────────────────────────────────────────────────────────────────

/**
 * Stores a collaboration request. Visitors may INSERT but not SELECT, so no
 * row is read back. The database validates the fields and rate-limits abuse
 * (surfaced as an AppError with code "rate_limited").
 */
export async function submitContact(input: ContactSubmissionInput): Promise<void> {
  assertOk(await getPublicApi().from('contact_submissions').insert(input))
}

// ── Admin (enforced by RLS — these fail for non-admins) ───────────────────

export async function listSubmissions(
  status: SubmissionStatus | 'all',
): Promise<ContactSubmission[]> {
  const supabase = await getSupabase()
  const query = supabase.from('contact_submissions').select('*')
  const filtered = status === 'all' ? query : query.eq('status', status)

  return unwrap(await filtered.order('created_at', { ascending: false }).limit(500))
}

export async function countNewSubmissions(): Promise<number> {
  const supabase = await getSupabase()
  return unwrapCount(
    await supabase
      .from('contact_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
  )
}

export async function updateSubmission(
  id: string,
  patch: { status?: SubmissionStatus; notes?: string | null },
): Promise<ContactSubmission> {
  const supabase = await getSupabase()
  return unwrap(
    await supabase.from('contact_submissions').update(patch).eq('id', id).select().single(),
  )
}

export async function deleteSubmission(id: string): Promise<void> {
  const supabase = await getSupabase()
  assertOk(await supabase.from('contact_submissions').delete().eq('id', id))
}
