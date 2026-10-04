import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { LoadingBlock } from '@/components/ui/Spinner'
import { env } from '@/config/env'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { acceptAdminInvite } from '@/services/admins'
import { useAuth } from './auth-context'
import { AccountForm, type RedeemProblem } from './components/AccountForm'
import { FormError } from './components/FormError'

const copy = t.admin.join

/**
 * The invitation code travels in the URL fragment (`/admin/join#CODE`): the
 * fragment is never sent to the web server, so the code stays out of access logs.
 */
function codeFromLocation(): string {
  return decodeURIComponent(window.location.hash.replace(/^#/, '')).trim()
}

async function redeemInvite(code: string): Promise<RedeemProblem | null> {
  const result = await acceptAdminInvite(code)
  if (result === 'ok') return null
  if (result === 'invalid_code') return { message: copy.errors.invalidCode, onCode: true }
  if (result === 'expired') return { message: copy.errors.expired }
  if (result === 'wrong_email') return { message: copy.errors.wrongEmail }
  return { message: t.errors.unknown }
}

/** /admin/join — where an invited person creates their account and becomes an admin. */
export function JoinPage() {
  const { config } = useSiteConfig()
  const { status, retry } = useAuth()
  const [initialCode] = useState(codeFromLocation)
  const [joined, setJoined] = useState(false)

  // Already an admin (or just became one and the role has been re-checked).
  if (status === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <main className="relative isolate grid min-h-dvh place-items-center px-4 py-12">
      <div aria-hidden="true" className="absolute inset-0 -z-10 hero-backdrop" />

      <div className="w-full max-w-xl">
        <div className="rounded-card border border-line-strong bg-surface p-6 shadow-card sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/14 text-primary-soft">
            <UserPlus aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-5 text-xs font-bold tracking-[0.16em] text-subtle uppercase">
            {config.name} · {copy.title}
          </p>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">{copy.heading}</h1>
          <p className="mt-2 text-sm text-muted">{copy.subtitle}</p>

          <div className="mt-6">
            {!env.isSupabaseConfigured ? (
              <FormError message={t.admin.login.notConfigured} />
            ) : joined ? (
              <LoadingBlock className="py-8" />
            ) : (
              <AccountForm
                codeLabel={copy.code}
                codeHint={copy.codeHint}
                codePlaceholder={copy.codePlaceholder}
                initialCode={initialCode}
                submitLabel={copy.submit}
                submittingLabel={copy.submitting}
                redeem={redeemInvite}
                onDone={() => {
                  // Re-check the role; the redirect above follows once it is confirmed.
                  setJoined(true)
                  retry()
                }}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
