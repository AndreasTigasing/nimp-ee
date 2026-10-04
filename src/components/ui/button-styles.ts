import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap ' +
  'transition duration-200 select-none disabled:pointer-events-none disabled:opacity-50 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-ink shadow-glow hover:brightness-110 active:brightness-95',
  accent: 'bg-accent text-accent-ink hover:brightness-105 active:brightness-95',
  secondary:
    'border border-line-strong bg-fg/5 text-fg hover:border-fg/45 hover:bg-fg/10 active:bg-fg/15',
  ghost: 'text-muted hover:bg-fg/8 hover:text-fg active:bg-fg/12',
  danger: 'border border-danger/45 bg-danger/12 text-danger hover:bg-danger/22 active:bg-danger/30',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
  icon: 'size-10',
}

export type ButtonStyleProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/** Shared class recipe for <Button> and <ButtonLink>. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonStyleProps = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className)
}
