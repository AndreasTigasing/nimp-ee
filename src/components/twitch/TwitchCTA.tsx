import { ArrowUpRight, Heart } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { safeUrl, twitchChannel } from '@/lib/url'
import { t } from '@/locales'
import { LiveBadge } from '@/modules/twitch-live/LiveBadge'
import { TwitchPlayer } from '@/modules/twitch-live/TwitchPlayer'
import { useTwitchLive } from '@/modules/twitch-live/useTwitchLive'
import { useSiteConfig } from '@/providers/site-config-context'

/**
 * Twitch block. While the channel is live (and the embed is enabled in the
 * admin settings) it shows the stream itself; otherwise a follow link.
 */
export function TwitchCTA() {
  const { config } = useSiteConfig()
  const twitchUrl = safeUrl(config.socials.twitch)
  const channel = twitchChannel(config.socials.twitch)
  const live = useTwitchLive(channel)

  if (!twitchUrl) return null

  const isLive = live.isLive === true
  const showPlayer = isLive && config.twitchEmbed && channel !== ''
  const title = config.twitchCtaTitle || t.twitchCta.defaultTitle

  let text = t.twitchCta.text
  if (isLive && live.title) text = live.title
  else if (live.isLive === false) text = t.twitchCta.offlineText

  return (
    <section id={t.anchors.twitch} aria-labelledby="twitch-cta-title" className="py-6 sm:py-10">
      <div className="container-page">
        <div className="relative isolate overflow-hidden rounded-[2rem] border border-primary/40 bg-surface px-6 py-10 sm:px-12 sm:py-14">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-linear-to-br from-primary/30 via-primary/8 to-transparent"
          />
          <SocialIcon
            platform="twitch"
            className="absolute -right-10 -bottom-14 -z-10 size-64 rotate-[-8deg] text-primary/20 sm:size-80"
          />

          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex items-center gap-2 text-xs font-bold tracking-[0.22em] text-primary-soft uppercase">
                  <SocialIcon platform="twitch" className="size-4" />
                  {t.twitchCta.eyebrow}
                </p>
                {isLive && <LiveBadge />}
              </div>
              <h2
                id="twitch-cta-title"
                className="mt-4 font-display text-3xl leading-tight font-bold tracking-tight text-balance-safe sm:text-4xl lg:text-5xl"
              >
                {title}
              </h2>
              <p className="mt-4 text-base text-muted sm:text-lg">
                {text}
                {isLive && live.game && <span className="text-subtle"> · {live.game}</span>}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
              <ButtonLink href={twitchUrl} external size="lg" className="max-sm:w-full">
                {isLive ? (
                  <>
                    {t.twitchCta.watchOnTwitch}
                    <ArrowUpRight aria-hidden="true" className="size-5" />
                  </>
                ) : (
                  <>
                    <Heart aria-hidden="true" className="size-5" />
                    {t.twitchCta.follow}
                  </>
                )}
              </ButtonLink>
              {channel && <p className="text-sm font-semibold text-subtle">twitch.tv/{channel}</p>}
            </div>
          </div>

          {showPlayer && (
            <TwitchPlayer
              channel={channel}
              title={t.twitchCta.playerTitle(config.displayName)}
              className="mt-8"
            />
          )}
        </div>
      </div>
    </section>
  )
}
