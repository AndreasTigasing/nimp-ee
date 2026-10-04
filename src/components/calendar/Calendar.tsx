import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { buttonClasses } from '@/components/ui/button-styles'
import { Spinner } from '@/components/ui/Spinner'
import { groupEventsByDay } from '@/lib/calendar'
import { cn } from '@/lib/cn'
import {
  currentMonth,
  dayKey,
  formatMonth,
  formatTime,
  formatWeekdayDate,
  monthGridDays,
  monthKey,
  shiftMonth,
  weekdayLabels,
  type MonthRef,
} from '@/lib/datetime'
import { t } from '@/locales'
import type { CalendarEvent } from '@/types/database'

type CalendarProps = {
  month: MonthRef
  onMonthChange: (month: MonthRef) => void
  events: CalendarEvent[]
  isLoading: boolean
  /** Selected day as a `yyyy-MM-dd` key in the site time zone. */
  selectedDay: string | null
  onSelectDay: (day: string) => void
}

/** How many event chips fit in a day cell on wide screens before "+N". */
const MAX_CHIPS = 2
/** How many markers a day cell shows on small screens. */
const MAX_MARKERS = 3

function EventMarker({ event }: { event: CalendarEvent }) {
  return event.is_sponsored ? (
    <Star className="size-2.5 fill-current text-accent" />
  ) : (
    <span className="size-1.5 rounded-full bg-primary-soft" />
  )
}

function EventChip({ event }: { event: CalendarEvent }) {
  return (
    <span
      className={cn(
        'block min-w-0 rounded-md px-1.5 py-1 text-[0.6875rem] leading-tight font-semibold',
        event.is_sponsored ? 'bg-accent/14 text-accent-soft' : 'bg-primary/16 text-primary-soft',
      )}
      style={event.color ? { boxShadow: `inset 2px 0 0 ${event.color}` } : undefined}
    >
      <span className="flex items-center gap-1 tabular-nums">
        {event.is_sponsored && <Star className="size-2.5 shrink-0 fill-current" />}
        {formatTime(event.start_at)}
      </span>
      <span className="block truncate font-medium text-fg/85">{event.title}</span>
    </span>
  )
}

/** Month grid. Days with events are buttons; selecting one reveals its events. */
export function Calendar({
  month,
  onMonthChange,
  events,
  isLoading,
  selectedDay,
  onSelectDay,
}: CalendarProps) {
  const [today] = useState(() => ({ key: dayKey(new Date()), month: currentMonth() }))
  const days = useMemo(() => monthGridDays(month), [month])
  const weekdays = useMemo(() => weekdayLabels(month), [month])
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events])
  const isCurrentMonth = monthKey(month) === monthKey(today.month)

  return (
    <div>
      <div className="flex items-center gap-2">
        <h3
          aria-live="polite"
          className="mr-auto flex items-center gap-3 font-display text-lg font-semibold sm:text-xl"
        >
          {/* ::first-letter needs a block container, which the flex heading is not. */}
          <span className="inline-block first-letter:uppercase">{formatMonth(month)}</span>
          {isLoading && <Spinner className="size-4 text-subtle" />}
        </h3>

        {!isCurrentMonth && (
          <button
            type="button"
            onClick={() => onMonthChange(today.month)}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            {t.calendar.today}
          </button>
        )}
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          aria-label={t.calendar.previousMonth}
          className={buttonClasses({ variant: 'secondary', size: 'icon' })}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          aria-label={t.calendar.nextMonth}
          className={buttonClasses({ variant: 'secondary', size: 'icon' })}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>

      {/* Day buttons carry the full date in their label, so the header row is decorative. */}
      <div aria-hidden="true" className="mt-5 grid grid-cols-7 gap-1 sm:gap-1.5">
        {weekdays.map((weekday) => (
          <div
            key={weekday.long}
            className="pb-1 text-center text-xs font-bold tracking-wider text-subtle uppercase"
          >
            {weekday.short}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((day) => {
          const key = dayKey(day)
          const dayEvents = eventsByDay.get(key) ?? []
          const inMonth = day.getMonth() === month.month
          const isToday = key === today.key
          const isSelected = key === selectedDay

          const dayNumber = (
            <span
              className={cn(
                'grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums',
                isToday && 'bg-primary font-bold text-primary-ink',
              )}
            >
              {day.getDate()}
            </span>
          )

          const cell = cn(
            'flex min-h-14 flex-col items-center gap-1 rounded-xl border p-1 md:min-h-24 md:items-stretch md:p-1.5',
            !inMonth && 'opacity-35',
          )

          if (dayEvents.length === 0) {
            return (
              <div
                key={key}
                aria-current={isToday ? 'date' : undefined}
                className={cn(cell, 'border-transparent')}
              >
                {dayNumber}
              </div>
            )
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${formatWeekdayDate(day)} – ${t.calendar.eventCount(dayEvents.length)}`}
              className={cn(
                cell,
                'cursor-pointer text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/12'
                  : 'border-line bg-fg/4 hover:border-line-strong hover:bg-fg/8',
              )}
            >
              {dayNumber}

              <span className="flex items-center justify-center gap-1 md:hidden">
                {dayEvents.slice(0, MAX_MARKERS).map((event) => (
                  <EventMarker key={event.id} event={event} />
                ))}
              </span>

              <span className="hidden min-w-0 flex-col gap-1 md:flex">
                {dayEvents.slice(0, MAX_CHIPS).map((event) => (
                  <EventChip key={event.id} event={event} />
                ))}
                {dayEvents.length > MAX_CHIPS && (
                  <span className="px-1 text-[0.6875rem] font-semibold text-subtle">
                    +{dayEvents.length - MAX_CHIPS}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <ul
        aria-label={t.calendar.legend}
        className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted"
      >
        <li className="flex items-center gap-2">
          <Star aria-hidden="true" className="size-3 fill-current text-accent" />
          {t.calendar.sponsored}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary-soft" />
          {t.calendar.regular}
        </li>
      </ul>
    </div>
  )
}
