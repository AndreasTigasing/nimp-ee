import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { t } from '@/locales'

type CopyState = 'idle' | 'copied' | 'failed'

/** Promo code with a one-tap copy button. The code stays selectable as plain text. */
export function PromoCode({ code, className }: { code: string; className?: string }) {
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = window.setTimeout(() => setState('idle'), 2200)
    return () => window.clearTimeout(timer)
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setState('copied')
    } catch {
      // Clipboard API unavailable or denied — the code is still visible to copy by hand.
      setState('failed')
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-control border border-dashed border-accent/45 bg-accent/8 py-2 pr-2 pl-4',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] leading-none font-bold tracking-[0.16em] text-subtle uppercase">
          {t.offers.promoCode}
        </p>
        <p className="mt-1.5 truncate font-mono text-lg leading-none font-bold tracking-wider text-accent-soft select-all">
          {code}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-accent px-3.5 text-xs font-bold text-accent-ink transition hover:brightness-105 active:brightness-95"
      >
        {state === 'copied' ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
        <span aria-live="polite">
          {state === 'copied'
            ? t.offers.copied
            : state === 'failed'
              ? t.offers.copyFailed
              : t.offers.copyCode}
        </span>
      </button>
    </div>
  )
}
