import { RotateCcw, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { t } from '@/locales'
import { Button } from './Button'

type StateMessageProps = {
  icon: LucideIcon
  title: string
  text?: string
  action?: ReactNode
  tone?: 'neutral' | 'danger'
  className?: string
}

/** Shared layout for empty and error states. */
export function StateMessage({
  icon: Icon,
  title,
  text,
  action,
  tone = 'neutral',
  className,
}: StateMessageProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-12 text-center',
        className,
      )}
    >
      <span
        className={cn(
          'mb-4 grid size-12 place-items-center rounded-2xl',
          tone === 'danger' ? 'bg-danger/12 text-danger' : 'bg-fg/6 text-muted',
        )}
      >
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <p className="font-display text-base font-semibold">{title}</p>
      {text && <p className="mt-2 max-w-md text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

type ErrorStateProps = {
  title: string
  error: unknown
  onRetry?: () => void
  className?: string
}

/** Error state with a localised, user-safe message and an optional retry button. */
export function ErrorState({ title, error, onRetry, className }: ErrorStateProps) {
  return (
    <div role="alert" className={className}>
      <StateMessage
        icon={TriangleAlert}
        tone="danger"
        title={title}
        text={errorMessage(error)}
        action={
          onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RotateCcw aria-hidden="true" className="size-4" />
              {t.common.retry}
            </Button>
          )
        }
      />
    </div>
  )
}
