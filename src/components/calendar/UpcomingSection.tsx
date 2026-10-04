import { Section } from '@/components/layout/Section'
import type { AsyncState } from '@/hooks/useAsync'
import { TIME_ZONE } from '@/lib/datetime'
import { t } from '@/locales'
import type { CalendarEvent } from '@/types/database'
import { UpcomingEvents } from './UpcomingEvents'

/**
 * The upcoming-events list as a section of its own — used when the admin
 * places it away from the month calendar (or hides the calendar).
 */
export function UpcomingSection({ upcoming }: { upcoming: AsyncState<CalendarEvent[]> }) {
  return (
    <Section
      id={t.anchors.upcoming}
      eyebrow={t.calendar.eyebrow}
      title={t.calendar.upcoming}
      subtitle={t.calendar.timezoneNote(TIME_ZONE)}
    >
      <UpcomingEvents events={upcoming} layout="grid" />
    </Section>
  )
}
