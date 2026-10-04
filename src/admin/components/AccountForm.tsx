import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { errorMessage, toAppError } from '@/lib/errors'
import { isEmail } from '@/lib/validation'
import { t } from '@/locales'
import { createOrSignIn } from '@/services/auth'
import { FormError } from './FormError'

const copy = t.admin.setup.account

const MIN_PASSWORD_LENGTH = 8

/** Why a code could not be redeemed. */
export type RedeemProblem = {
  message: string
  /** Show the message under the code field instead of as a form error. */
  onCode?: boolean
  /** Offer a link to the sign-in page (the code is no longer needed). */
  offerLogin?: boolean
}

type AccountFormProps = {
  codeLabel: string
  codeHint: string
  codePlaceholder: string
  /** Pre-filled code, e.g. taken from an invitation link. */
  initialCode?: string
  submitLabel: string
  submittingLabel: string
  /**
   * Redeems the code for the user who has just signed in. Resolves to null on
   * success. The role is granted by the database, never by this form.
   */
  redeem: (code: string) => Promise<RedeemProblem | null>
  onDone: () => void
}

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
 * "Code + e-mail + password" form shared by the first-run setup and the admin
 * invitation page: creates the account (or signs in to an existing one) and
 * then redeems the code.
 */
export function AccountForm({
  codeLabel,
  codeHint,
  codePlaceholder,
  initialCode = '',
  submitLabel,
  submittingLabel,
  redeem,
  onDone,
}: AccountFormProps) {
  const [values, setValues] = useState<Values>({
    code: initialCode,
    email: '',
    password: '',
    repeat: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<RedeemProblem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function set(key: keyof Values, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    setProblem(null)
    setNotice(null)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      const account = await createOrSignIn(values.email.trim(), values.password)
      if (account === 'confirmation-required') {
        setNotice(copy.confirmEmail(submitLabel))
        return
      }

      const failure = await redeem(values.code)
      if (!failure) onDone()
      else if (failure.onCode) setErrors({ code: failure.message })
      else setProblem(failure)
    } catch (caught) {
      setProblem({ message: accountErrorMessage(caught) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-4">
      <TextField
        label={codeLabel}
        hint={codeHint}
        placeholder={codePlaceholder}
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
      {problem && (
        <div className="flex flex-col gap-3">
          <FormError message={problem.message} />
          {problem.offerLogin && (
            <Link to="/admin/login" className="text-sm font-bold text-primary-soft hover:text-fg">
              {t.admin.login.title} →
            </Link>
          )}
        </div>
      )}

      <Button type="submit" size="lg" loading={busy} className="mt-2 w-full">
        {busy ? submittingLabel : submitLabel}
      </Button>
    </form>
  )
}
