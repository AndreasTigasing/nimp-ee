import { getPublicApi, getSupabase } from '@/lib/supabase'
import type { Offer, OfferInput } from '@/types/database'
import { assertOk, unwrap, unwrapCount } from './helpers'

// ── Public ────────────────────────────────────────────────────────────────

/** Offers visitors may see: active, not archived, started and not expired. */
export async function listLiveOffers(): Promise<Offer[]> {
  return unwrap(
    await getPublicApi()
      .from('live_offers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
  )
}

export async function countLiveOffers(): Promise<number> {
  return unwrapCount(
    await getPublicApi().from('live_offers').select('id', { count: 'exact', head: true }),
  )
}

// ── Admin (enforced by RLS — these fail for non-admins) ───────────────────

export async function listOffers(scope: 'current' | 'archived'): Promise<Offer[]> {
  const supabase = await getSupabase()
  const query = supabase.from('offers').select('*')
  const scoped =
    scope === 'archived' ? query.not('archived_at', 'is', null) : query.is('archived_at', null)

  return unwrap(
    await scoped.order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
  )
}

export async function createOffer(input: OfferInput): Promise<Offer> {
  const supabase = await getSupabase()
  return unwrap(await supabase.from('offers').insert(input).select().single())
}

export async function updateOffer(id: string, patch: Partial<OfferInput>): Promise<Offer> {
  const supabase = await getSupabase()
  return unwrap(await supabase.from('offers').update(patch).eq('id', id).select().single())
}

export async function setOfferActive(id: string, isActive: boolean): Promise<Offer> {
  return updateOffer(id, { is_active: isActive })
}

/** Soft delete: the offer leaves the public site but can be restored. */
export async function archiveOffer(id: string): Promise<void> {
  const supabase = await getSupabase()
  assertOk(
    await supabase.from('offers').update({ archived_at: new Date().toISOString() }).eq('id', id),
  )
}

/** Restored offers come back hidden, so nothing goes public by accident. */
export async function restoreOffer(id: string): Promise<void> {
  const supabase = await getSupabase()
  assertOk(
    await supabase.from('offers').update({ archived_at: null, is_active: false }).eq('id', id),
  )
}

/** Permanent delete. The UI only offers this for archived offers. */
export async function deleteOffer(id: string): Promise<void> {
  const supabase = await getSupabase()
  assertOk(await supabase.from('offers').delete().eq('id', id))
}
