import { addDays } from 'date-fns'
import type { CalendarEvent } from '@/types/database'
import { dayKey, zoned } from './datetime'

/** Events without an end time are treated as lasting this long. */
const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000

/** A multi-day event is drawn on at most this many consecutive days. */
const MAX_SPAN_DAYS = 31

export function eventEnd(event: CalendarEvent): number {
  return event.end_at
    ? new Date(event.end_at).getTime()
    : new Date(event.start_at).getTime() + DEFAULT_DURATION_MS
}

export function isEventOver(event: CalendarEvent, now: number = Date.now()): boolean {
  return eventEnd(event) < now
}

/** Groups events by every calendar day (site time zone) they touch. */
export function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const byDay = new Map<string, CalendarEvent[]>()

  for (const event of events) {
    const lastDay = event.end_at ? dayKey(event.end_at) : dayKey(event.start_at)
    let cursor = zoned(event.start_at)

    for (let span = 0; span < MAX_SPAN_DAYS; span += 1) {
      const key = dayKey(cursor)
      const bucket = byDay.get(key)
      if (bucket) bucket.push(event)
      else byDay.set(key, [event])
      if (key >= lastDay) break
      cursor = addDays(cursor, 1)
    }
  }

  return byDay
}
