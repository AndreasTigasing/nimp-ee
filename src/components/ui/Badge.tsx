import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger'

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-line-strong bg-fg/6 text-muted',
  primary: 'border-primary/45 bg-primary/14 text-primary-soft',
  accent: 'border-accent/45 bg-accent/12 text-accent-soft',
  success: 'border-success/40 bg-success/12 text-success',
  warning: 'border-warning/40 bg-warning/12 text-warning',
  danger: 'border-danger/40 bg-danger/12 text-danger',
}

type BadgeProps = {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs leading-none font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
