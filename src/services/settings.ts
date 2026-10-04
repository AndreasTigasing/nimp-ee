import { toAppError } from '@/lib/errors'
import { getPublicApi, getSupabase } from '@/lib/supabase'
import type { SiteSettings, SiteSettingsInput } from '@/types/database'
import { unwrap } from './helpers'

/** The admin-editable settings row (world-readable), or null if it does not exist. */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  const { data, error } = await getPublicApi().from('site_settings').select('*').maybeSingle()
  if (error) throw toAppError(error)
  return data
}

/** Admin only (enforced by RLS). */
export async function updateSiteSettings(patch: SiteSettingsInput): Promise<SiteSettings> {
  const supabase = await getSupabase()
  return unwrap(await supabase.from('site_settings').update(patch).eq('id', true).select().single())
}
