import { addDays } from 'date-fns'
import { Globe } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Section } from '@/components/layout/Section'
import { useAsync, type AsyncState } from '@/hooks/useAsync'
import { groupEventsByDay } from '@/lib/calendar'
import { cn } from '@/lib/cn'
import {
  TIME_ZONE,
  currentMonth,
  formatDayKey,
  monthGridDays,
  monthKey,
  type MonthRef,
} from '@/lib/datetime'
import { errorMessage } from '@/lib/errors'
import { t } from '@/locales'
import { listVisibleEvents } from '@/services/calendar'
import type { CalendarEvent } from '@/types/database'
import { Calendar } from './Calendar'
import { EventCard } from './EventCard'
import { UpcomingEvents } from './UpcomingEvents'

/** UTC bounds of everything visible in the month grid (including padding days). */
function gridRange(month: MonthRef): { from: string; to: string } {
  const days = monthGridDays(month)
  const first = days[0]
  const last = days[days.length - 1]
  if (!first || !last) throw new Error('Empty month grid')
  return {
    from: new Date(first.getTime()).toISOString(),
    to: new Date(addDays(last, 1).getTime()).toISOString(),
  }
}

type CalendarSectionProps = {
  /**
   * Upcoming events to show next to the month grid. Omitted when the admin
   * placed the upcoming list elsewhere (or hid it): the grid then spans the
   * full width.
   */
  upcoming?: AsyncState<CalendarEvent[]>
}

export function CalendarSection({ upcoming }: CalendarSectionProps) {
  const [month, setMonth] = useState(currentMonth)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const monthEvents = useAsync(`events:${monthKey(month)}`, () =>
    listVisibleEvents(gridRange(month)),
  )
  const events = useMemo(() => monthEvents.data ?? [], [monthEvents.data])
  const selectedEvents = useMemo(
    () => (selectedDay ? (groupEventsByDay(events).get(selectedDay) ?? []) : []),
    [events, selectedDay],
  )

  function changeMonth(next: MonthRef) {
    setMonth(next)
    setSelectedDay(null)
  }

  return (
    <Section
      id={t.anchors.calendar}
      eyebrow={t.calendar.eyebrow}
      title={t.calendar.title}
      subtitle={t.calendar.subtitle}
      aside={
        <p className="flex items-center gap-2 text-xs font-medium text-subtle">
          <Globe aria-hidden="true" className="size-4 shrink-0" />
          {t.calendar.timezoneNote(TIME_ZONE)}
        </p>
      }
    >
      <div
        className={cn(
          'grid items-start gap-6',
          upcoming && 'lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]',
        )}
      >
        <div className="rounded-card border border-line bg-surface p-4 sm:p-6">
          <Calendar
            month={month}
            onMonthChange={changeMonth}
            events={events}
            isLoading={monthEvents.isLoading}
            selectedDay={selectedDay}
            onSelectDay={(day) => setSelectedDay((current) => (current === day ? null : day))}
          />

          {monthEvents.error && (
            <p role="alert" className="mt-4 text-sm font-medium text-danger">
              {t.calendar.errorTitle}. {errorMessage(monthEvents.error)}{' '}
              <button
                type="button"
                onClick={monthEvents.reload}
                className="font-bold underline underline-offset-4 hover:text-fg"
              >
                {t.common.retry}
              </button>
            </p>
          )}

          <div aria-live="polite" className="mt-5 border-t border-line pt-5">
            {selectedDay ? (
              <>
                <h3 className="text-sm font-bold first-letter:uppercase">
                  {t.calendar.dayEvents(formatDayKey(selectedDay))}
                </h3>
                {selectedEvents.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-3">
                    {selectedEvents.map((event) => (
                      <li key={event.id}>
                        <EventCard event={event} className="bg-raised" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">{t.calendar.noDayEvents}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-subtle">{t.calendar.selectDayHint}</p>
            )}
          </div>
        </div>

        {upcoming && <UpcomingEvents events={upcoming} />}
      </div>
    </Section>
  )
}
