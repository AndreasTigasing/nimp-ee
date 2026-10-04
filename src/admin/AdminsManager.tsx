import { Check, Copy, MailPlus, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField, controlClasses } from '@/components/ui/Field'
import { LoadingBlock } from '@/components/ui/Spinner'
import { ErrorState, StateMessage } from '@/components/ui/StateMessage'
import { useToast } from '@/components/ui/toast-context'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/cn'
import { formatDateTime, formatShortDate } from '@/lib/datetime'
import { errorMessage } from '@/lib/errors'
import { emptyToNull, isEmail } from '@/lib/validation'
import { t } from '@/locales'
import {
  createAdminInvite,
  listAdminInvites,
  listAdmins,
  removeAdmin,
  revokeAdminInvite,
} from '@/services/admins'
import type { AdminAccount } from '@/types/database'
import { ConfirmDialog, type Confirmation } from './components/ConfirmDialog'
import { FormError } from './components/FormError'
import { PageHeader } from './components/PageHeader'
import { useAdminAction } from './hooks/useAdminAction'

const copy = t.admin.admins

const VALIDITY_OPTIONS = [1, 7, 30]

/** Absolute link an invited person opens. The code sits in the fragment (never sent to servers). */
function inviteLink(code: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}admin/join#${code}`
}

/** Shows a freshly created invitation. The code cannot be retrieved again later. */
function CreatedInvite({ code, onDismiss }: { code: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)
  const link = inviteLink(code)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2200)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // Clipboard unavailable: the link is selectable in the field.
    }
  }

  return (
    <div role="status" className="rounded-2xl border border-success/45 bg-success/8 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{copy.createdTitle}</p>
          <p className="mt-1 text-sm text-muted">{copy.createdText}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t.common.close}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:text-fg"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <label className="mt-4 block text-xs font-bold tracking-[0.16em] text-subtle uppercase">
        {copy.link}
        <input
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
          className={cn(
            controlClasses,
            'mt-1.5 h-12 font-mono text-sm tracking-normal normal-case',
          )}
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => void copyLink()}>
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          <span aria-live="polite">{copied ? copy.copied : copy.copy}</span>
        </Button>
        <p className="text-sm text-muted">
          {copy.code}: <span className="font-mono font-bold text-fg select-all">{code}</span>
        </p>
      </div>
    </div>
  )
}

export function AdminsManager() {
  const toast = useToast()
  const admins = useAsync('admin:admins', listAdmins)
  const invites = useAsync('admin:invites', listAdminInvites)
  const { busyId, run } = useAdminAction(invites.reload)

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [validDays, setValidDays] = useState(7)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)
    const trimmed = email.trim()
    if (trimmed !== '' && !isEmail(trimmed)) {
      setEmailError(t.admin.validation.email)
      return
    }

    setCreating(true)
    try {
      setCreatedCode(await createAdminInvite(emptyToNull(trimmed), validDays))
      setEmail('')
      invites.reload()
    } catch (error) {
      setCreateError(errorMessage(error))
    } finally {
      setCreating(false)
    }
  }

  function confirmRemove(admin: AdminAccount) {
    setConfirmation({
      title: copy.confirmRemoveTitle,
      text: copy.confirmRemoveText(admin.email),
      confirmLabel: copy.remove,
      danger: true,
      action: async () => {
        const result = await removeAdmin(admin.user_id)
        if (result === 'cannot_remove_self') throw new Error(copy.cannotRemoveSelf)
        toast.success(copy.removed)
        admins.reload()
      },
    })
  }

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <section aria-labelledby="admins-list" className="mb-8">
        <h2 id="admins-list" className="mb-4 font-display text-lg font-semibold">
          {copy.listTitle}
        </h2>

        {admins.data === undefined && admins.isLoading && <LoadingBlock />}
        {admins.data === undefined && admins.error && (
          <ErrorState title={copy.errorTitle} error={admins.error} onRetry={admins.reload} />
        )}

        {admins.data && (
          <ul className="flex flex-col gap-3">
            {admins.data.map((admin) => (
              <li
                key={admin.user_id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-line bg-surface p-4"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/14 text-primary-soft">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1 basis-60">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 font-semibold break-all">{admin.email}</p>
                    {admin.is_self && <Badge tone="primary">{copy.you}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {copy.added(formatShortDate(admin.added_at))} ·{' '}
                    {admin.last_sign_in_at
                      ? copy.lastSignIn(formatDateTime(admin.last_sign_in_at))
                      : copy.neverSignedIn}
                  </p>
                </div>
                {!admin.is_self && (
                  <Button variant="ghost" size="sm" onClick={() => confirmRemove(admin)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                    {copy.remove}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="admins-invite"
        className="mb-8 rounded-card border border-line bg-surface p-5 sm:p-6"
      >
        <h2 id="admins-invite" className="font-display text-lg font-semibold">
          {copy.inviteTitle}
        </h2>
        <p className="mt-2 text-sm text-muted">{copy.inviteHint}</p>

        <form
          onSubmit={(event) => void handleCreate(event)}
          noValidate
          className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]"
        >
          <TextField
            label={copy.inviteEmail}
            hint={copy.inviteEmailHint}
            optional
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            error={emailError ?? undefined}
            onChange={(event) => {
              setEmail(event.target.value)
              setEmailError(null)
            }}
          />
          <SelectField
            label={copy.validFor}
            value={String(validDays)}
            onChange={(event) => setValidDays(Number(event.target.value))}
            options={VALIDITY_OPTIONS.map((days) => ({
              value: String(days),
              label: copy.days(days),
            }))}
          />
          <div className="sm:col-span-2">
            <Button type="submit" loading={creating}>
              {!creating && <UserPlus aria-hidden="true" className="size-4" />}
              {creating ? copy.creating : copy.create}
            </Button>
          </div>
        </form>

        {createError && <FormError className="mt-4" message={createError} />}
        {createdCode && (
          <div className="mt-5">
            <CreatedInvite code={createdCode} onDismiss={() => setCreatedCode(null)} />
          </div>
        )}

        <p className="mt-5 text-xs text-subtle">{copy.signupNote}</p>
      </section>

      <section aria-labelledby="admins-pending">
        <h2 id="admins-pending" className="mb-4 font-display text-lg font-semibold">
          {copy.pendingTitle}
        </h2>

        {invites.data === undefined && invites.isLoading && <LoadingBlock />}
        {invites.data === undefined && invites.error && (
          <ErrorState title={copy.errorTitle} error={invites.error} onRetry={invites.reload} />
        )}
        {invites.data?.length === 0 && <StateMessage icon={MailPlus} title={copy.noPending} />}

        {invites.data && invites.data.length > 0 && (
          <ul className="flex flex-col gap-3">
            {invites.data.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-line bg-surface p-4"
              >
                <div className="min-w-0 flex-1 basis-60">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 font-semibold break-all">
                      {invite.email ?? copy.anyEmail}
                    </p>
                    {invite.is_expired && <Badge tone="warning">{copy.expired}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {copy.expires(formatDateTime(invite.expires_at))}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={busyId === invite.id}
                  onClick={() =>
                    void run(invite.id, () => revokeAdminInvite(invite.id), copy.revoked)
                  }
                >
                  {busyId !== invite.id && <X aria-hidden="true" className="size-4" />}
                  {copy.revoke}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </>
  )
}
