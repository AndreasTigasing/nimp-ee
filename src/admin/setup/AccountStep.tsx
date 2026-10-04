import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { errorMessage, toAppError } from '@/lib/errors'
import { isEmail } from '@/lib/validation'
import { t } from '@/locales'
import { claimFirstAdmin, createOrSignIn } from '@/services/auth'
import { FormError } from '../components/FormError'

const copy = t.admin.setup.account

const MIN_PASSWORD_LENGTH = 8

type Values = { code: string; email: string; password: string; repeat: string }
type Errors = Partial<Record<keyof Values, string>>

function validate(values: Values): Errors {
  const errors: Errors = {}
  if (values.code.trim() === '') errors.code = copy.errors.codeRequired
  if (!isEmail(values.email.trim())) errors.email = copy.errors.emailInvalid
  if (values.password.length < MIN_PASSWORD_LENGTH) errors.password = copy.errors.passwordShort
  else if (values.password !== values.repeat) errors.repeat = copy.errors.passwordMismatch
  return errors
}

/** Translates a failure of account creation into a message for the form. */
function accountErrorMessage(error: unknown): string {
  const appError = toAppError(error)
  if (appError.message === 'signup_disabled') return copy.errors.signupDisabled
  if (appError.message === 'weak_password') return copy.errors.weakPassword
  if (appError.code === 'unauthorized') return copy.errors.wrongPassword
  return errorMessage(appError)
}

/**
 * Step 1: create the account and claim the admin role with the one-time setup
 * code. The role is granted by the database, not by this form.
 */
export function AccountStep({ onDone }: { onDone: () => void }) {
  const [values, setValues] = useState<Values>({ code: '', email: '', password: '', repeat: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [alreadyDone, setAlreadyDone] = useState(false)

  function set(key: keyof Values, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    setError(null)
    setNotice(null)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      const account = await createOrSignIn(values.email.trim(), values.password)
      if (account === 'confirmation-required') {
        setNotice(copy.confirmEmail)
        return
      }

      const claim = await claimFirstAdmin(values.code)
      if (claim === 'ok') onDone()
      else if (claim === 'invalid_code') setErrors({ code: copy.errors.invalidCode })
      else if (claim === 'already_done') setAlreadyDone(true)
      else setError(t.errors.unknown)
    } catch (caught) {
      setError(accountErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-4">
      <TextField
        label={copy.code}
        hint={copy.codeHint}
        placeholder={copy.codePlaceholder}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={values.code}
        error={errors.code}
        onChange={(event) => set('code', event.target.value)}
      />
      <TextField
        label={copy.email}
        hint={copy.emailHint}
        type="email"
        inputMode="email"
        autoComplete="username"
        value={values.email}
        error={errors.email}
        onChange={(event) => set('email', event.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={copy.password}
          hint={copy.passwordHint}
          type="password"
          autoComplete="new-password"
          value={values.password}
          error={errors.password}
          onChange={(event) => set('password', event.target.value)}
        />
        <TextField
          label={copy.passwordRepeat}
          type="password"
          autoComplete="new-password"
          value={values.repeat}
          error={errors.repeat}
          onChange={(event) => set('repeat', event.target.value)}
        />
      </div>

      {notice && (
        <p
          role="status"
          className="rounded-control border border-primary/45 bg-primary/10 px-4 py-3 text-sm font-medium"
        >
          {notice}
        </p>
      )}
      {error && <FormError message={error} />}
      {alreadyDone && (
        <div className="flex flex-col gap-3">
          <FormError message={copy.errors.alreadyDone} />
          <Link to="/admin/login" className="text-sm font-bold text-primary-soft hover:text-fg">
            {t.admin.login.title} →
          </Link>
        </div>
      )}

      <Button type="submit" size="lg" loading={busy} className="mt-2 w-full">
        {busy ? copy.submitting : copy.submit}
      </Button>
    </form>
  )
}
