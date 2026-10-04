import { ArrowUpRight, CalendarDays, Handshake, Tag } from 'lucide-react'
import { useState } from 'react'
import { calendarAnchor, sectionHref } from '@/components/layout/nav'
import { SocialLinks } from '@/components/social/SocialLinks'
import { ButtonLink } from '@/components/ui/Button'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { isSectionVisible } from '@/config/sections'
import { profileImageVariant } from '@/config/seo'
import { cn } from '@/lib/cn'
import { formatTime, formatWeekdayDate } from '@/lib/datetime'
import { safeUrl, twitchChannel } from '@/lib/url'
import { t } from '@/locales'
import { LiveBadge } from '@/modules/twitch-live/LiveBadge'
import { useTwitchLive } from '@/modules/twitch-live/useTwitchLive'
import { useSiteConfig } from '@/providers/site-config-context'
import type { CalendarEvent } from '@/types/database'

type HeroProps = {
  /** Next calendar entry; undefined while loading or when unavailable. */
  nextEvent: CalendarEvent | null | undefined
  /** Number of live offers; undefined while loading or when unavailable. */
  offerCount: number | undefined
}

/** Scales the display name so short handles are huge and long names still fit. */
function nameSizeClass(name: string): string {
  if (name.length <= 6) return 'text-[clamp(3.5rem,17vw,8.5rem)]'
  if (name.length <= 11) return 'text-[clamp(2.75rem,11vw,6rem)]'
  return 'text-[clamp(2.25rem,7.5vw,4.25rem)]'
}

const floatingCard =
  'glass border-line-strong shadow-card animate-rise hover:border-fg/45 flex items-center gap-3 rounded-2xl border p-3.5 pr-5 transition-colors'

export function Hero({ nextEvent, offerCount }: HeroProps) {
  const { config } = useSiteConfig()
  const live = useTwitchLive(twitchChannel(config.socials.twitch))
  const twitchUrl = safeUrl(config.socials.twitch)
  const showCollaboration = isSectionVisible(config.sections, 'collaboration')

  // Info cards over the portrait. Each one appears only when it is enabled in
  // the admin settings, its section is shown, and it has something to say.
  const offersTeaser =
    config.heroTeasers.offers &&
    isSectionVisible(config.sections, 'offers') &&
    typeof offerCount === 'number' &&
    offerCount > 0
  const calendarTarget = calendarAnchor(config.sections)
  const eventTeaser =
    config.heroTeasers.nextEvent && calendarTarget && nextEvent
      ? { anchor: calendarTarget, event: nextEvent }
      : null

  const portrait = profileImageVariant(config.image, 600)
  // If the large variant is missing, fall back to the configured URL as-is.
  const [brokenPortrait, setBrokenPortrait] = useState<string | null>(null)

  return (
    <section
      id={t.anchors.home}
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 hero-backdrop" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 dot-grid" />

      <div className="container-page grid items-center gap-12 pt-12 pb-16 sm:pt-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-16 lg:pt-24 lg:pb-28">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {live.isLive && <LiveBadge />}
            <p className="inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-fg/5 px-3.5 py-1.5 text-xs font-bold tracking-[0.16em] text-muted uppercase">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
              {config.tagline}
            </p>
          </div>

          <h1
            id="hero-title"
            className={cn(
              'mt-6 font-display leading-[0.92] font-extrabold tracking-tight text-balance-safe',
              nameSizeClass(config.displayName),
            )}
          >
            {config.displayName}
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            {config.heroLead || t.hero.lead}
          </p>

          {config.tags.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {config.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-line bg-fg/5 px-3 py-1 text-xs font-semibold text-muted"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-wrap gap-3 empty:hidden">
            {config.heroButtons.twitch && twitchUrl && (
              <ButtonLink href={twitchUrl} external size="lg" className="max-sm:flex-1">
                <SocialIcon platform="twitch" className="size-5" />
                {t.nav.watchOnTwitch}
              </ButtonLink>
            )}
            {config.heroButtons.collaboration && showCollaboration && (
              <ButtonLink
                href={sectionHref(t.anchors.collaboration)}
                variant="secondary"
                size="lg"
                className="max-sm:flex-1"
              >
                <Handshake aria-hidden="true" className="size-5" />
                {t.hero.secondaryCta}
              </ButtonLink>
            )}
          </div>

          <SocialLinks socials={config.socials} className="mt-8" />
        </div>

        <div className="relative mx-auto w-full max-w-88 lg:mx-0 lg:max-w-none lg:justify-self-end">
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-8 -z-10 rounded-full bg-primary/30 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-3 translate-y-3 rounded-[2.25rem] border border-accent/55"
            />
            <img
              src={brokenPortrait === portrait ? config.image : portrait}
              alt={t.hero.imageAlt(config.displayName)}
              width={600}
              height={600}
              fetchPriority="high"
              onError={() => setBrokenPortrait(portrait)}
              className="relative aspect-square w-full rounded-[2.25rem] border border-line-strong bg-surface object-cover"
            />
          </div>

          {/* Live data teasers: stacked under the portrait on phones, floating over it from sm up. */}
          <div className="mt-8 flex flex-col gap-3 empty:hidden sm:mt-0 sm:block">
            {offersTeaser && (
              <a
                href={sectionHref(t.anchors.offers)}
                className={cn(floatingCard, 'sm:absolute sm:-top-5 sm:-right-4 lg:-right-6')}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink">
                  <Tag aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-subtle">
                    {t.hero.activeOffers}
                  </span>
                  <span className="block font-display text-lg leading-tight font-bold">
                    {offerCount}
                  </span>
                </span>
              </a>
            )}

            {eventTeaser && (
              <a
                href={sectionHref(eventTeaser.anchor)}
                className={cn(
                  floatingCard,
                  'sm:absolute sm:-bottom-7 sm:-left-5 sm:max-w-[min(19rem,92%)] lg:-left-10',
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-ink">
                  <CalendarDays aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-subtle">
                    {t.hero.nextEvent}
                  </span>
                  <span className="block truncate text-sm font-bold">
                    {eventTeaser.event.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {formatWeekdayDate(eventTeaser.event.start_at)} ·{' '}
                    {formatTime(eventTeaser.event.start_at)}
                  </span>
                </span>
                <ArrowUpRight aria-hidden="true" className="ml-auto size-4 shrink-0 text-subtle" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
