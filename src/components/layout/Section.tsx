import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type SectionProps = {
  id: string
  eyebrow: string
  title: string
  subtitle?: string
  /** Extra content aligned to the right of the heading on wide screens. */
  aside?: ReactNode
  className?: string
  children: ReactNode
}

/** A titled page section with consistent spacing and an accessible heading. */
export function Section({
  id,
  eyebrow,
  title,
  subtitle,
  aside,
  className,
  children,
}: SectionProps) {
  const headingId = `${id}-title`

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn('py-14 sm:py-20 lg:py-24', className)}
    >
      <div className="container-page">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 sm:mb-10">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-xs font-bold tracking-[0.22em] text-accent-soft uppercase">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              {eyebrow}
            </p>
            <h2
              id={headingId}
              className="mt-3 font-display text-3xl font-bold tracking-tight text-balance-safe sm:text-4xl"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">{subtitle}</p>
            )}
          </div>
          {aside}
        </div>
        {children}
      </div>
    </section>
  )
}
