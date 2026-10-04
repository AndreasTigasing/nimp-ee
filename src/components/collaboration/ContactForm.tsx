import { CircleCheck, Send } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { env } from '@/config/env'
import { errorMessage, toAppError } from '@/lib/errors'
import { emptyToNull, isEmail, LIMITS } from '@/lib/validation'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { submitContact } from '@/services/contact'

const copy = t.collaboration.form

type Values = { name: string; company: string; email: string; message: string }
type Errors = Partial<Record<keyof Values, string>>
type Status = 'idle' | 'submitting' | 'success'

const EMPTY: Values = { name: '', company: '', email: '', message: '' }

/*
 * Client-side anti-spam, layered on top of the database rate limit:
 *   - honeypot: a field humans never see; bots that fill it are silently dropped
 *   - minimum time: nobody writes a proposal in under three seconds
 *   - cooldown: one submission per minute per browser
 * None of this is security — it only keeps cheap bots away from the API.
 */
const MIN_FILL_MS = 3000
const COOLDOWN_MS = 60_000
const COOLDOWN_KEY = 'streamer-site:last-contact'

function isCoolingDown(): boolean {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY))
    return Number.isFinite(last) && Date.now() - last < COOLDOWN_MS
  } catch {
    return false
  }
}

function startCooldown(): void {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
  } catch {
    // Storage unavailable: the database rate limit still applies.
  }
}

function validate(values: Values): Errors {
  const errors: Errors = {}
  const name = values.name.trim()
  const email = values.email.trim()
  const message = values.message.trim()

  if (name.length < LIMITS.name.min) errors.name = copy.validation.nameRequired
  else if (name.length > LIMITS.name.max) errors.name = copy.validation.nameTooLong

  if (values.company.trim().length > LIMITS.company.max) {
    errors.company = copy.validation.companyTooLong
  }

  if (email === '') errors.email = copy.validation.emailRequired
  else if (!isEmail(email)) errors.email = copy.validation.emailInvalid

  if (message.length < LIMITS.message.min) {
    errors.message = copy.validation.messageTooShort(LIMITS.message.min)
  } else if (message.length > LIMITS.message.max) {
    errors.message = copy.validation.messageTooLong(LIMITS.message.max)
  }

  return errors
}

export function ContactForm() {
  const { config } = useSiteConfig()
  const [values, setValues] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const firstInteraction = useRef<number | null>(null)

  // Counts rejected submissions. After each one — once the error messages are
  // in the DOM — focus moves to the first invalid field for keyboard and
  // screen-reader users.
  const [invalidSubmits, setInvalidSubmits] = useState(0)
  useEffect(() => {
    if (invalidSubmits === 0) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [invalidSubmits])

  function update(field: keyof Values, value: string) {
    firstInteraction.current ??= Date.now()
    setValues((current) => ({ ...current, [field]: value }))
    // Clear a field's error as soon as the user edits it.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setInvalidSubmits((count) => count + 1)
      return
    }

    const filledTooFast =
      firstInteraction.current === null || Date.now() - firstInteraction.current < MIN_FILL_MS
    if (honeypot !== '' || filledTooFast) {
      // Looks automated: pretend it worked so the bot gets no signal to adapt to.
      setStatus('success')
      return
    }

    if (isCoolingDown()) {
      setSubmitError(copy.cooldown)
      return
    }

    setStatus('submitting')
    try {
      await submitContact({
        name: values.name.trim(),
        company: emptyToNull(values.company),
        email: values.email.trim().toLowerCase(),
        message: values.message.trim(),
      })
      startCooldown()
      setValues(EMPTY)
      setStatus('success')
    } catch (error) {
      const { code } = toAppError(error)
      const base = code === 'unknown' ? copy.errorFallback : errorMessage(error)
      const emailHint = config.businessEmail ? ` ${copy.errorEmailHint(config.businessEmail)}` : ''
      setSubmitError(`${base}${code === 'rate_limited' ? '' : emailHint}`)
      setStatus('idle')
    }
  }

  if (status === 'success') {
    return (
      <div role="status" className="flex flex-col items-center py-8 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-success/14 text-success">
          <CircleCheck aria-hidden="true" className="size-7" />
        </span>
        <p className="mt-5 font-display text-lg font-semibold">{copy.successTitle}</p>
        <p className="mt-2 text-sm text-muted">{copy.successText}</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-6"
          onClick={() => {
            firstInteraction.current = null
            setStatus('idle')
          }}
        >
          {copy.sendAnother}
        </Button>
      </div>
    )
  }

  const isSubmitting = status === 'submitting'

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={copy.name}
          name="name"
          autoComplete="name"
          placeholder={copy.namePlaceholder}
          maxLength={LIMITS.name.max}
          required
          value={values.name}
          error={errors.name}
          onChange={(event) => update('name', event.target.value)}
        />
        <TextField
          label={copy.company}
          name="company"
          autoComplete="organization"
          placeholder={copy.companyPlaceholder}
          maxLength={LIMITS.company.max}
          optional
          value={values.company}
          error={errors.company}
          onChange={(event) => update('company', event.target.value)}
        />
      </div>

      <TextField
        label={copy.email}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder={copy.emailPlaceholder}
        maxLength={LIMITS.email.max}
        required
        value={values.email}
        error={errors.email}
        onChange={(event) => update('email', event.target.value)}
      />

      <TextAreaField
        label={copy.message}
        name="message"
        rows={5}
        placeholder={copy.messagePlaceholder}
        maxLength={LIMITS.message.max}
        required
        value={values.message}
        error={errors.message}
        onChange={(event) => update('message', event.target.value)}
      />

      {/* Honeypot — hidden from people and assistive tech, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>
      </div>

      {submitError && (
        <p
          role="alert"
          className="rounded-control border border-danger/45 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
        >
          {submitError}
        </p>
      )}

      {!env.isSupabaseConfigured && (
        <p className="text-sm font-medium text-warning">{copy.unavailable}</p>
      )}

      <Button
        type="submit"
        size="lg"
        loading={isSubmitting}
        disabled={!env.isSupabaseConfigured}
        className="w-full"
      >
        {!isSubmitting && <Send aria-hidden="true" className="size-5" />}
        {isSubmitting ? copy.submitting : copy.submit}
      </Button>

      <p className="text-center text-xs text-subtle">{copy.privacy}</p>
    </form>
  )
}
