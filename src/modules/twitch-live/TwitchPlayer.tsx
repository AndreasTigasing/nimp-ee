import { cn } from '@/lib/cn'

type TwitchPlayerProps = {
  channel: string
  /** Accessible name of the embedded player. */
  title: string
  className?: string
}

/**
 * Twitch's official embedded player (no API key needed). Twitch requires the
 * embedding page's host name in `parent`; it is taken from the current page,
 * so the same build works on localhost, *.github.io and a custom domain.
 * Starts muted so browsers allow autoplay.
 */
export function TwitchPlayer({ channel, title, className }: TwitchPlayerProps) {
  const src = new URL('https://player.twitch.tv/')
  src.searchParams.set('channel', channel)
  src.searchParams.set('parent', window.location.hostname)
  src.searchParams.set('muted', 'true')

  return (
    <div
      className={cn(
        'aspect-video w-full overflow-hidden rounded-2xl border border-line-strong bg-black',
        className,
      )}
    >
      <iframe
        src={src.href}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="size-full"
      />
    </div>
  )
}
