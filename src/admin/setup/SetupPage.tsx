import { CircleCheck, Rocket, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { buttonClasses } from '@/components/ui/button-styles'
import { LoadingBlock } from '@/components/ui/Spinner'
import { env } from '@/config/env'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { isSetupRequired } from '@/services/auth'
import { useAuth } from '../auth-context'
import { FormError } from '../components/FormError'
import { AccountStep } from './AccountStep'
import { DomainStep } from './DomainStep'
import { SiteStep } from './SiteStep'

const copy = t.admin.setup

const STEPS = ['account', 'site', 'domain'] as const
type Step = (typeof STEPS)[number] | 'done'

/**
 * First-run quick setup at /admin/setup. Shown only while the site has no
 * admin: step 1 creates the account (guarded by the one-time setup code), the
 * remaining steps are ordinary admin settings and can be skipped.
 */
export function SetupPage() {
  const { config } = useSiteConfig()
  const { retry } = useAuth()
  const setup = useAsync('setup-required', isSetupRequired)
  const [step, setStep] = useState<Step>('account')

  // Once an admin exists the wizard is closed to everyone who is not midway
  // through it (they are past step 1 and already hold the admin role).
  if (step === 'account' && setup.data === false) {
    return <Navigate to="/admin" replace />
  }

  const stepIndex = step === 'done' ? STEPS.length : STEPS.indexOf(step)
  const headings = {
    account: copy.account.heading,
    site: copy.site.heading,
    domain: copy.domain.heading,
    done: copy.done.heading,
  }

  return (
    <main className="relative isolate grid min-h-dvh place-items-center px-4 py-12">
      <div aria-hidden="true" className="absolute inset-0 -z-10 hero-backdrop" />

      <div className="w-full max-w-xl">
        <div className="rounded-card border border-line-strong bg-surface p-6 shadow-card sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/14 text-primary-soft">
            <Rocket aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-5 text-xs font-bold tracking-[0.16em] text-subtle uppercase">
            {config.name} · {copy.title}
          </p>

          {step !== 'done' && (
            <ol aria-label={copy.title} className="mt-4 flex gap-2">
              {STEPS.map((id, index) => (
                <li
                  key={id}
                  aria-current={index === stepIndex ? 'step' : undefined}
                  className={cn(
                    'flex-1 rounded-full border px-3 py-1.5 text-center text-xs font-bold',
                    index === stepIndex && 'border-primary bg-primary/14 text-fg',
                    index < stepIndex && 'border-success/45 text-success',
                    index > stepIndex && 'border-line text-subtle',
                  )}
                >
                  {index + 1}. {copy.steps[id]}
                </li>
              ))}
            </ol>
          )}

          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">{headings[step]}</h1>
          {step === 'account' && <p className="mt-2 text-sm text-muted">{copy.subtitle}</p>}

          <div className="mt-6">
            {!env.isSupabaseConfigured ? (
              <FormError message={t.admin.login.notConfigured} />
            ) : step === 'account' && setup.isLoading ? (
              <LoadingBlock className="py-8" />
            ) : step === 'account' ? (
              <AccountStep
                onDone={() => {
                  // Re-check the role so the rest of the admin UI unlocks.
                  retry()
                  setStep('site')
                }}
              />
            ) : step === 'site' ? (
              <SiteStep onDone={() => setStep('domain')} />
            ) : step === 'domain' ? (
              <DomainStep onDone={() => setStep('done')} />
            ) : (
              <div className="flex flex-col gap-5">
                <p className="flex items-start gap-3 text-sm text-muted">
                  <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
                  {copy.done.text}
                </p>
                <p className="flex items-start gap-3 rounded-control border border-warning/45 bg-warning/10 px-4 py-3 text-sm font-medium">
                  <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
                  {copy.done.signupReminder}
                </p>
                <Link to="/admin" className={buttonClasses({ size: 'lg', className: 'w-full' })}>
                  {copy.done.open}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
