import { CircleCheck, TriangleAlert, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { t } from '@/locales'
import { ToastContext, type ToastApi, type ToastTone } from './toast-context'

type Toast = {
  id: number
  tone: ToastTone
  message: string
}

const DISMISS_AFTER_MS = 4500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current
      nextId.current += 1
      // Keep at most three on screen.
      setToasts((current) => [...current.slice(-2), { id, tone, message }])
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
    }),
    [push],
  )

  return (
    <ToastContext value={api}>
      {children}
      {/* A <dialog> opened with showModal() lives in the top layer and would
          cover this region, so admin dialogs close before their toast shows. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-2xl border glass px-4 py-3 text-sm shadow-card',
              toast.tone === 'error' ? 'border-danger/50' : 'border-success/45',
            )}
          >
            {toast.tone === 'error' ? (
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
            ) : (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
            )}
            <p className="min-w-0 flex-1 py-0.5 font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t.common.close}
              className="-mr-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-fg"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
