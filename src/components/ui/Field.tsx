import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'
import { t } from '@/locales'

/** Shared look of text-like form controls. 16px text prevents iOS zoom-on-focus. */
export const controlClasses =
  'border-line-strong bg-bg/55 text-fg placeholder:text-subtle w-full rounded-control border px-4 text-base ' +
  'transition-colors hover:border-fg/40 focus:border-primary ' +
  'aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-60'

/** Square swatch look for `<input type="color">`. */
export const swatchClasses =
  'border-line-strong hover:border-fg/40 size-12 shrink-0 cursor-pointer overflow-hidden rounded-control border bg-transparent transition-colors'

type FieldChrome = {
  label: string
  hint?: string
  error?: string
  /** Appends "(valikuline)" to the label. */
  optional?: boolean
  className?: string
}

type FieldShellProps = FieldChrome & {
  id: string
  children: ReactNode
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

/** Label + control + hint + error, wired together for assistive technology. */
function FieldShell({ id, label, hint, error, optional, className, children }: FieldShellProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && <span className="ml-1.5 font-normal text-subtle">({t.common.optional})</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

type TextFieldProps = FieldChrome & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>

export function TextField({ label, hint, error, optional, className, ...props }: TextFieldProps) {
  const id = useId()
  return (
    <FieldShell {...{ id, label, hint, error, optional, className }}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses, 'h-12')}
        {...props}
      />
    </FieldShell>
  )
}

type TextAreaFieldProps = FieldChrome &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  className,
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  const id = useId()
  return (
    <FieldShell {...{ id, label, hint, error, optional, className }}>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses, 'min-h-24 resize-y py-3 leading-relaxed')}
        {...props}
      />
    </FieldShell>
  )
}

type SelectFieldProps = FieldChrome &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
    options: { value: string; label: string }[]
  }

export function SelectField({
  label,
  hint,
  error,
  optional,
  className,
  options,
  ...props
}: SelectFieldProps) {
  const id = useId()
  return (
    <FieldShell {...{ id, label, hint, error, optional, className }}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlClasses, 'h-12 pr-10')}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface text-fg">
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

type SwitchFieldProps = {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

/** Accessible on/off toggle (a checkbox with role="switch"). */
export function SwitchField({
  label,
  hint,
  checked,
  onChange,
  disabled,
  className,
}: SwitchFieldProps) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(event) => onChange(event.target.checked)}
          className="peer size-full cursor-pointer appearance-none rounded-full bg-fg/15 transition-colors checked:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-semibold">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="mt-0.5 text-xs text-subtle">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
