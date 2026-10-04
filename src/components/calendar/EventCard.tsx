import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  Dices,
  Gift,
  Radio,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { BrandMark } from '@/components/ui/BrandMark'
import { cn } from '@/lib/cn'
import { formatTimeRange, formatZoned } from '@/lib/datetime'
import { safeUrl } from '@/lib/url'
import { t } from '@/locales'
import type { CalendarEvent, EventType } from '@/types/database'

const TYPE_ICONS: Record<EventType, LucideIcon> = {
  stream: Radio,
  casino: Dices,
  giveaway: Gift,
  tournament: Trophy,
  special: Sparkles,
  other: CalendarDays,
}

type EventCardProps = {
  event: CalendarEvent
  className?: string
}

/**
 * One calendar entry. Sponsored events differ from regular ones by a labelled
 * badge and icon as well as colour, so the distinction never relies on colour alone.
 */
export function EventCard({ event, className }: EventCardProps) {
  const TypeIcon = TYPE_ICONS[event.event_type]
  const ctaUrl = safeUrl(event.cta_url)

  return (
    <article
      className={cn(
        'relative flex gap-4 overflow-hidden rounded-card border border-line bg-surface p-4',
        className,
      )}
    >
      {event.color && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: event.color }}
        />
      )}

      <time
        dateTime={event.start_at}
        className={cn(
          'flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-2xl border py-2.5',
          event.is_sponsored
            ? 'border-accent/45 bg-accent/10 text-accent-soft'
            : 'border-line-strong bg-fg/5 text-fg',
        )}
      >
        <span className="text-[0.6875rem] leading-none font-bold tracking-wider uppercase">
          {formatZoned(event.start_at, 'LLL')}
        </span>
        <span className="mt-1 font-display text-2xl leading-none font-bold">
          {formatZoned(event.start_at, 'd')}
        </span>
        <span className="mt-1 text-[0.6875rem] leading-none font-semibold text-subtle uppercase">
          {formatZoned(event.start_at, 'EEEEEE')}
        </span>
      </time>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {event.is_sponsored && (
            <Badge tone="accent">
              <Star aria-hidden="true" className="size-3 fill-current" />
              {t.calendar.sponsored}
            </Badge>
          )}
          <Badge>
            <TypeIcon aria-hidden="true" className="size-3" />
            {t.calendar.eventTypes[event.event_type]}
          </Badge>
        </div>

        <h4 className="mt-2.5 font-display text-base leading-snug font-semibold text-balance-safe">
          {event.title}
        </h4>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Clock aria-hidden="true" className="size-3.5" />
            {formatTimeRange(event.start_at, event.end_at)}
          </span>
          {event.brand_name && (
            <>
              <span aria-hidden="true" className="text-subtle">
                ·
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {event.brand_logo && (
                  <BrandMark name={event.brand_name} logo={event.brand_logo} size="xs" />
                )}
                <span className="truncate">{event.brand_name}</span>
              </span>
            </>
          )}
        </p>

        {event.description && (
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
            {event.description}
          </p>
        )}

        {ctaUrl && (
          <a
            href={ctaUrl}
            target="_blank"
            rel={event.is_sponsored ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary-soft transition-colors hover:text-fg"
          >
            {t.calendar.eventCta}
            <ArrowUpRight aria-hidden="true" className="size-4" />
            <span className="sr-only">
              : {event.title} ({t.common.newTab})
            </span>
          </a>
        )}
      </div>
    </article>
  )
}
