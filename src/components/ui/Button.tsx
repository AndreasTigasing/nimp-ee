import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { t } from '@/locales'
import { buttonClasses, type ButtonStyleProps } from './button-styles'
import { Spinner } from './Spinner'

type ButtonProps = ButtonStyleProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Shows a spinner and disables the button. */
    loading?: boolean
  }

export function Button({
  variant,
  size,
  className,
  loading = false,
  disabled,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}

type ButtonLinkProps = ButtonStyleProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    /** Opens in a new tab with safe `rel` and an accessible hint. */
    external?: boolean
    /** Marks a paid / partner link (`rel="sponsored"`). */
    sponsored?: boolean
  }

export function ButtonLink({
  variant,
  size,
  className,
  external = false,
  sponsored = false,
  children,
  ...props
}: ButtonLinkProps) {
  const rel = [external && 'noopener noreferrer', sponsored && 'sponsored']
    .filter(Boolean)
    .join(' ')

  return (
    <a
      className={buttonClasses({ variant, size, className })}
      target={external ? '_blank' : undefined}
      rel={rel || undefined}
      {...props}
    >
      {children}
      {external && <span className="sr-only">({t.common.newTab})</span>}
    </a>
  )
}
