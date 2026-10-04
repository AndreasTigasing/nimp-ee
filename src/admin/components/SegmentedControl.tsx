import { cn } from '@/lib/cn'

type SegmentedControlProps<T extends string> = {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
}

/** Small set of mutually exclusive filters, rendered as a group of toggle buttons. */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex max-w-full gap-1 overflow-x-auto rounded-control border border-line bg-surface p-1',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-9 shrink-0 rounded-[0.625rem] px-4 text-sm font-semibold transition-colors',
              isActive ? 'bg-fg/10 text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
