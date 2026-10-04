import { cn } from '@/lib/cn'

/** Placeholder block shown while content loads. Decorative: hidden from assistive tech. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-fg/8', className)} />
}
