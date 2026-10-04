import { useState } from 'react'
import { cn } from '@/lib/cn'
import { safeUrl } from '@/lib/url'
import { t } from '@/locales'

type BrandMarkProps = {
  name: string
  logo?: string | null
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

const SIZES = {
  xs: 'size-5 rounded-md text-[0.5rem]',
  sm: 'size-9 rounded-xl text-xs',
  md: 'size-12 rounded-2xl text-sm',
} as const

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1 ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}` : name.slice(0, 2)
  return letters.toUpperCase()
}

/** Brand logo, falling back to the brand's initials when there is no (working) image. */
export function BrandMark({ name, logo, size = 'md', className }: BrandMarkProps) {
  const src = safeUrl(logo)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = src !== undefined && failedSrc !== src

  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden border border-line-strong bg-raised font-display font-semibold text-muted',
        SIZES[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={t.offers.brandLogoAlt(name)}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  )
}
