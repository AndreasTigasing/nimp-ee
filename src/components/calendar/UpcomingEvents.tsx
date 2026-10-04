import { CalendarDays } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState, StateMessage } from '@/components/ui/StateMessage'
import type { AsyncState } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { t } from '@/locales'
import type { CalendarEvent } from '@/types/database'
import { EventCard } from './EventCard'

type UpcomingEventsProps = {
  /** Upcoming events, loaded once by the page and shared with the hero. */
  events: AsyncState<CalendarEvent[]>
  /**
   * "column": a single column next to the month grid, with its own heading.
   * "grid": a full-width responsive grid inside a stand-alone section.
   */
  layout?: 'column' | 'grid'
}

const LIST_CLASSES = {
  column: 'flex flex-col gap-3',
  grid: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
} as const

export function UpcomingEvents({ events, layout = 'column' }: UpcomingEventsProps) {
  const { data, error, isLoading, reload } = events
  const listClasses = LIST_CLASSES[layout]

  return (
    <div>
      {layout === 'column' && (
        <h3 className="mb-5 font-display text-lg font-semibold sm:text-xl">
          {t.calendar.upcoming}
        </h3>
      )}

      {data === undefined && isLoading && (
        <div role="status" aria-label={t.common.loading} className={listClasses}>
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex gap-4 rounded-card border border-line bg-surface p-4">
              <Skeleton className="h-18 w-14 rounded-2xl" />
              <div className="flex-1">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {data === undefined && error && (
        <ErrorState title={t.calendar.errorTitle} error={error} onRetry={reload} />
      )}

      {data?.length === 0 && (
        <StateMessage
          icon={CalendarDays}
          title={t.calendar.emptyUpcomingTitle}
          text={t.calendar.emptyUpcomingText}
        />
      )}

      {data && data.length > 0 && (
        <ol className={listClasses}>
          {data.map((event) => (
            <li key={event.id}>
              <EventCard event={event} className={cn(layout === 'grid' && 'h-full')} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
