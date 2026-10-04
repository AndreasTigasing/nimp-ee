import { TZDate } from '@date-fns/tz'
import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfWeek } from 'date-fns'
import { siteConfig } from '@/config/streamer'
import { dateLocale } from '@/locales'

/*
 * All timestamps are stored in UTC (timestamptz) and shown in ONE fixed time
 * zone — the site's, not the visitor's — so a stream announced for 19:00 reads
 * 19:00 for everybody. Every date in the UI must go through this module.
 */

export const TIME_ZONE = siteConfig.timeZone

type DateInput = string | number | Date

/** The given instant as a date object whose getters report site-time-zone values. */
export function zoned(value: DateInput): TZDate {
  return new TZDate(new Date(value).getTime(), TIME_ZONE)
}

export function nowZoned(): TZDate {
  return TZDate.tz(TIME_ZONE)
}

export function formatZoned(value: DateInput, pattern: string): string {
  return format(zoned(value), pattern, { locale: dateLocale })
}

/** 1. oktoober 2026 */
export const formatDate = (value: DateInput) => formatZoned(value, 'd. MMMM yyyy')
/** 01.10.2026 */
export const formatShortDate = (value: DateInput) => formatZoned(value, 'dd.MM.yyyy')
/** 19:00 */
export const formatTime = (value: DateInput) => formatZoned(value, 'HH:mm')
/** 01.10.2026 19:00 */
export const formatDateTime = (value: DateInput) => formatZoned(value, 'dd.MM.yyyy HH:mm')
/** neljapäev, 1. oktoober */
export const formatWeekdayDate = (value: DateInput) => formatZoned(value, 'EEEE, d. MMMM')
/** Sortable calendar-day key in the site time zone: 2026-10-01 */
export const dayKey = (value: DateInput) => formatZoned(value, 'yyyy-MM-dd')

/** Formats a `yyyy-MM-dd` day key (as produced by `dayKey`) like `formatWeekdayDate`. */
export function formatDayKey(key: string): string {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number)
  return format(new TZDate(year, month - 1, day, 12, TIME_ZONE), 'EEEE, d. MMMM', {
    locale: dateLocale,
  })
}

/** "19:00–22:00", or just "19:00" when there is no end or it falls on another day. */
export function formatTimeRange(start: DateInput, end: DateInput | null | undefined): string {
  if (!end || dayKey(start) !== dayKey(end)) return formatTime(start)
  return `${formatTime(start)}–${formatTime(end)}`
}

// ── Month navigation ──────────────────────────────────────────────────────

/** A calendar month in the site time zone. `month` is 0-based like Date. */
export type MonthRef = { year: number; month: number }

export function currentMonth(): MonthRef {
  const now = nowZoned()
  return { year: now.getFullYear(), month: now.getMonth() }
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const index = year * 12 + month + delta
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 }
}

export function monthKey({ year, month }: MonthRef): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function firstOfMonth({ year, month }: MonthRef): TZDate {
  return new TZDate(year, month, 1, TIME_ZONE)
}

/** oktoober 2026 */
export function formatMonth(ref: MonthRef): string {
  return format(firstOfMonth(ref), 'LLLL yyyy', { locale: dateLocale })
}

/**
 * Every day shown in a month grid: whole weeks, starting on the locale's first
 * weekday. The dates are zoned (date-fns derives them from a TZDate), so their
 * getters report site-time-zone values.
 */
export function monthGridDays(ref: MonthRef): Date[] {
  const first = firstOfMonth(ref)
  return eachDayOfInterval({
    start: startOfWeek(first, { locale: dateLocale }),
    end: endOfWeek(endOfMonth(first), { locale: dateLocale }),
  })
}

/** Localised narrow weekday labels in grid order, e.g. E T K N R L P. */
export function weekdayLabels(ref: MonthRef): { short: string; long: string }[] {
  return monthGridDays(ref)
    .slice(0, 7)
    .map((day) => ({
      short: format(day, 'EEEEEE', { locale: dateLocale }),
      long: format(day, 'EEEE', { locale: dateLocale }),
    }))
}

// ── <input type="datetime-local"> conversion (admin forms) ────────────────

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

/**
 * Interprets a datetime-local value ("2026-10-01T19:00") as wall-clock time in
 * the site time zone and returns the UTC ISO string to store. Null if invalid.
 */
export function localInputToIso(value: string): string | null {
  const match = LOCAL_INPUT.exec(value)
  if (!match) return null
  const [year = 0, month = 1, day = 1, hour = 0, minute = 0] = match.slice(1).map(Number)
  const date = new TZDate(year, month - 1, day, hour, minute, TIME_ZONE)
  const time = date.getTime()
  return Number.isNaN(time) ? null : new Date(time).toISOString()
}

/** Inverse of `localInputToIso`: a stored UTC timestamp as a datetime-local value. */
export function isoToLocalInput(value: string | null | undefined): string {
  return value ? formatZoned(value, "yyyy-MM-dd'T'HH:mm") : ''
}
