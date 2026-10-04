import { SocialIcon } from '@/components/ui/SocialIcon'
import { SOCIAL_PLATFORMS, type SocialPlatform, type StreamerConfig } from '@/config/types'
import { cn } from '@/lib/cn'
import { safeUrl } from '@/lib/url'
import { t } from '@/locales'

type SocialLinksProps = {
  socials: StreamerConfig['socials']
  /** "sm": a compact single row for the header. */
  size?: 'md' | 'sm'
  className?: string
}

const LIST = {
  md: 'flex-wrap gap-2',
  sm: 'gap-1',
} as const

const LINK = {
  md: 'size-11 rounded-control',
  sm: 'size-9 rounded-xl',
} as const

/** Configured (non-empty, valid) social profiles in a fixed platform order. */
function configuredSocials(socials: StreamerConfig['socials']) {
  return SOCIAL_PLATFORMS.flatMap((platform: SocialPlatform) => {
    const url = safeUrl(socials[platform])
    return url ? [{ platform, url }] : []
  })
}

export function SocialLinks({ socials, size = 'md', className }: SocialLinksProps) {
  const links = configuredSocials(socials)
  if (links.length === 0) return null

  return (
    <ul aria-label={t.socials.label} className={cn('flex items-center', LIST[size], className)}>
      {links.map(({ platform, url }) => (
        <li key={platform}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer me"
            className={cn(
              'grid place-items-center border border-line-strong bg-fg/5 text-muted transition duration-200 hover:-translate-y-0.5 hover:border-primary/70 hover:bg-primary/15 hover:text-fg',
              LINK[size],
            )}
          >
            <SocialIcon platform={platform} className={size === 'sm' ? 'size-4' : 'size-5'} />
            <span className="sr-only">
              {t.socials[platform]} ({t.common.newTab})
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}
