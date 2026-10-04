import { AboutSection } from '@/components/about/AboutSection'
import { CalendarSection } from '@/components/calendar/CalendarSection'
import { UpcomingSection } from '@/components/calendar/UpcomingSection'
import { CollaborationSection } from '@/components/collaboration/CollaborationSection'
import { Hero } from '@/components/hero/Hero'
import { Layout } from '@/components/layout/Layout'
import { OffersSection } from '@/components/offers/OffersSection'
import { TwitchCTA } from '@/components/twitch/TwitchCTA'
import { calendarHasUpcoming } from '@/config/sections'
import { buildSeoMeta } from '@/config/seo'
import { siteConfig } from '@/config/streamer'
import type { SectionId } from '@/config/types'
import { useAsync } from '@/hooks/useAsync'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useSiteConfig } from '@/providers/site-config-context'
import { listUpcomingEvents } from '@/services/calendar'
import { listLiveOffers } from '@/services/offers'

const UPCOMING_LIMIT = 6

export function HomePage() {
  const { config } = useSiteConfig()
  const meta = buildSeoMeta(config, siteConfig)
  usePageMeta({
    title: meta.title,
    description: meta.description,
    canonical: config.siteUrl ? `${config.siteUrl}/` : undefined,
  })

  // Loaded once here and shared: the hero teasers and the sections below use
  // the same data. Each section renders its own loading / empty / error state,
  // so a database outage never takes the rest of the page down.
  const offers = useAsync('live-offers', listLiveOffers)
  const upcoming = useAsync('upcoming-events', () => listUpcomingEvents(UPCOMING_LIMIT))

  // Section order and visibility come from the admin settings.
  const upcomingBesideCalendar = calendarHasUpcoming(config.sections)

  function renderSection(id: SectionId) {
    switch (id) {
      case 'about':
        return <AboutSection key={id} />
      case 'offers':
        return <OffersSection key={id} offers={offers} />
      case 'calendar':
        return <CalendarSection key={id} upcoming={upcomingBesideCalendar ? upcoming : undefined} />
      case 'upcoming':
        return upcomingBesideCalendar ? null : <UpcomingSection key={id} upcoming={upcoming} />
      case 'twitch':
        return <TwitchCTA key={id} />
      case 'collaboration':
        return <CollaborationSection key={id} />
    }
  }

  return (
    <Layout>
      <Hero
        nextEvent={upcoming.data ? (upcoming.data[0] ?? null) : undefined}
        offerCount={offers.data?.length}
      />
      {config.sections.filter((section) => section.visible).map(({ id }) => renderSection(id))}
    </Layout>
  )
}
