import { isEventOver } from '@/lib/calendar'
import { getPublicApi, getSupabase } from '@/lib/supabase'
import type { CalendarEvent, CalendarEventInput } from '@/types/database'
import { assertOk, unwrap, unwrapCount } from './helpers'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** Lower bound for "upcoming" queries, so events still in progress are included. */
function ongoingCutoff(): string {
  return new Date(Date.now() - 12 * HOUR_MS).toISOString()
}

// ── Public ────────────────────────────────────────────────────────────────

/**
 * Visible events starting within [from, to). The lower bound is padded so a
 * multi-day event that began before `from` is still returned.
 */
export async function listVisibleEvents(range: {
  from: string
  to: string
}): Promise<CalendarEvent[]> {
  const paddedFrom = new Date(new Date(range.from).getTime() - 31 * DAY_MS).toISOString()

  return unwrap(
    await getPublicApi()
      .from('calendar_events')
      .select('*')
      .eq('is_visible', true)
      .gte('start_at', paddedFrom)
      .lt('start_at', range.to)
      .order('start_at', { ascending: true }),
  )
}

export async function listUpcomingEvents(limit = 6): Promise<CalendarEvent[]> {
  const events = unwrap(
    await getPublicApi()
      .from('calendar_events')
      .select('*')
      .eq('is_visible', true)
      .gte('start_at', ongoingCutoff())
      .order('start_at', { ascending: true })
      .limit(limit + 4),
  )
  return events.filter((event) => !isEventOver(event)).slice(0, limit)
}

export async function countUpcomingEvents(): Promise<number> {
  return unwrapCount(
    await getPublicApi()
      .from('calendar_events')
      .select('id', { count: 'exact', head: true })
      .eq('is_visible', true)
      .gte('start_at', new Date().toISOString()),
  )
}

// ── Admin (enforced by RLS — these fail for non-admins) ───────────────────

export async function listEvents(scope: 'upcoming' | 'past'): Promise<CalendarEvent[]> {
  const supabase = await getSupabase()
  const query = supabase.from('calendar_events').select('*')
  const cutoff = ongoingCutoff()

  return unwrap(
    scope === 'upcoming'
      ? await query.gte('start_at', cutoff).order('start_at', { ascending: true })
      : await query.lt('start_at', cutoff).order('start_at', { ascending: false }).limit(200),
  )
}

export async function createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
  const supabase = await getSupabase()
  return unwrap(await supabase.from('calendar_events').insert(input).select().single())
}

export async function updateEvent(
  id: string,
  patch: Partial<CalendarEventInput>,
): Promise<CalendarEvent> {
  const supabase = await getSupabase()
  return unwrap(await supabase.from('calendar_events').update(patch).eq('id', id).select().single())
}

export async function setEventVisible(id: string, isVisible: boolean): Promise<CalendarEvent> {
  return updateEvent(id, { is_visible: isVisible })
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = await getSupabase()
  assertOk(await supabase.from('calendar_events').delete().eq('id', id))
}
