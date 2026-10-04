import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { env } from '@/config/env'
import { useAsync } from '@/hooks/useAsync'
import { errorMessage, toAppError } from '@/lib/errors'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { isSetupRequired, signIn, signOut } from '@/services/auth'
import { useAuth } from './auth-context'
import { FormError } from './components/FormError'

const copy = t.admin.login

function redirectTarget(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  // Only ever redirect inside the admin area.
  return typeof from === 'string' && from.startsWith('/admin') && from !== '/admin/login'
    ? from
    : '/admin'
}

export function LoginPage() {
  const { config } = useSiteConfig()
  const { status, email: signedInEmail, retry } = useAuth()
  const location = useLocation()
  const setup = useAsync('setup-required', isSetupRequired)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'admin') {
    return <Navigate to={redirectTarget(location.state)} replace />
  }

  // A brand-new site has no admin to sign in as: go to the first-run setup.
  if (setup.data === true) {
    return <Navigate to="/admin/setup" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      // Success: AuthProvider picks up the session, verifies admin rights and
      // this page redirects (or shows the "not an admin" notice).
    } catch (caught) {
      const appError = toAppError(caught)
      setError(appError.code === 'unauthorized' ? copy.invalid : errorMessage(appError))
    } finally {
      setSubmitting(false)
    }
  }

  const busy = submitting || status === 'loading'

  return (
    <main className="relative isolate grid min-h-dvh place-items-center px-4 py-12">
      <div aria-hidden="true" className="absolute inset-0 -z-10 hero-backdrop" />

      <div className="w-full max-w-md">
        <div className="rounded-card border border-line-strong bg-surface p-6 shadow-card sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/14 text-primary-soft">
            <LockKeyhole aria-hidden="true" className="size-6" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {config.name} · {copy.subtitle}
          </p>

          {!env.isSupabaseConfigured && <FormError className="mt-6" message={copy.notConfigured} />}

          {status === 'not-admin' && (
            <div className="mt-6 flex flex-col gap-3">
              <FormError
                message={`${copy.notAdmin}${signedInEmail ? ` (${signedInEmail})` : ''}`}
              />
              <Button variant="secondary" size="sm" onClick={() => void signOut()}>
                {t.admin.nav.signOut}
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-6 flex flex-col gap-3">
              <FormError message={t.errors.network} />
              <Button variant="secondary" size="sm" onClick={retry}>
                {t.common.retry}
              </Button>
            </div>
          )}

          {(status === 'signed-out' || status === 'loading') && (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <TextField
                label={copy.email}
                type="email"
                name="email"
                autoComplete="username"
                inputMode="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <TextField
                label={copy.password}
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {error && <FormError message={error} />}
              <Button
                type="submit"
                size="lg"
                loading={busy}
                disabled={!env.isSupabaseConfigured}
                className="mt-2 w-full"
              >
                {busy ? copy.submitting : copy.submit}
              </Button>
            </form>
          )}
        </div>

        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.common.backHome}
        </Link>
      </div>
    </main>
  )
}
