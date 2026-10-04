import { cn } from '@/lib/cn'
import { t } from '@/locales'

/** Red "LIVE" pill with a pulsing dot. Render only when the channel is known to be live. */
export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-live px-3 py-1.5 text-xs leading-none font-bold tracking-wider text-white',
        className,
      )}
    >
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-white" />
        <span className="relative inline-flex size-2 rounded-full bg-white" />
      </span>
      <span aria-hidden="true">{t.twitchCta.live}</span>
      <span className="sr-only">{t.twitchCta.liveNow}</span>
    </span>
  )
}
