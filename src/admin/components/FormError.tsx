import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Inline error banner for forms and dialogs (announced to screen readers). */
export function FormError({ message, className }: { message: string; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-control border border-danger/45 bg-danger/10 px-4 py-3 text-sm font-medium text-danger',
        className,
      )}
    >
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{message}</span>
    </p>
  )
}
