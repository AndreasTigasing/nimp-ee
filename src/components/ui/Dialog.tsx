import { X } from 'lucide-react'
import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { t } from '@/locales'
import { buttonClasses } from './button-styles'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** Sticky action row at the bottom (e.g. Save / Cancel). */
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** While true (e.g. saving) the dialog cannot be dismissed. */
  busy?: boolean
  /**
   * Close when the backdrop is clicked. Turn off for forms, so a stray click
   * outside the panel cannot throw away what has been typed.
   */
  closeOnBackdrop?: boolean
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
} as const

/**
 * Modal built on the native <dialog> element, which provides focus trapping,
 * Escape-to-close, the top layer and inert background for free.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  busy = false,
  closeOnBackdrop = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // The panel fills the dialog box, so a click that lands on the <dialog>
  // element itself can only have hit the backdrop.
  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget && closeOnBackdrop && !busy) onClose()
  }

  // Fired after the browser closed the dialog (Escape). Browsers only honour
  // preventDefault() on `cancel` once, so while busy the dialog is re-opened.
  function handleNativeClose() {
    if (busy && open) ref.current?.showModal()
    else onClose()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
      onClose={handleNativeClose}
      onClick={handleBackdropClick}
      className={cn(
        'm-auto w-[calc(100%-1.5rem)] overflow-visible bg-transparent p-0 text-fg',
        'backdrop:bg-black/70 backdrop:backdrop-blur-sm',
        SIZES[size],
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-1.5rem)] animate-rise flex-col overflow-hidden rounded-card border border-line-strong bg-surface shadow-card">
          <header className="flex items-start gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-lg leading-snug font-semibold">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label={t.common.close}
              className={buttonClasses({
                variant: 'ghost',
                size: 'icon',
                className: '-mt-1 -mr-2',
              })}
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>

          <div className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>

          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface px-5 py-4 sm:px-6">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
