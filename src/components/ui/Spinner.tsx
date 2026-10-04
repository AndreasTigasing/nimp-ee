import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { t } from '@/locales'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cn('animate-spin', className)} />
}

/** Centered spinner with an accessible label, for whole regions that are loading. */
export function LoadingBlock({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn('flex items-center justify-center gap-3 py-16 text-muted', className)}
    >
      <Spinner className="size-5" />
      <span className="text-sm">{t.common.loading}</span>
    </div>
  )
}
