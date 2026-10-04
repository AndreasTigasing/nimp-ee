import {
  Archive,
  ArchiveRestore,
  Building2,
  Inbox,
  Mail,
  MailCheck,
  MailOpen,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { TextAreaField } from '@/components/ui/Field'
import { LoadingBlock } from '@/components/ui/Spinner'
import { ErrorState, StateMessage } from '@/components/ui/StateMessage'
import { useToast } from '@/components/ui/toast-context'
import { useAsync } from '@/hooks/useAsync'
import { formatDateTime } from '@/lib/datetime'
import { emptyToNull } from '@/lib/validation'
import { t } from '@/locales'
import { deleteSubmission, listSubmissions, updateSubmission } from '@/services/contact'
import type { ContactSubmission, SubmissionStatus } from '@/types/database'
import { ConfirmDialog, type Confirmation } from './components/ConfirmDialog'
import { PageHeader } from './components/PageHeader'
import { SegmentedControl } from './components/SegmentedControl'
import { useAdminAction } from './hooks/useAdminAction'

const copy = t.admin.submissions

type Filter = SubmissionStatus | 'all'

const STATUS_TONES: Record<SubmissionStatus, BadgeTone> = {
  new: 'accent',
  read: 'neutral',
  archived: 'neutral',
}

/** Builds a mailto: link without letting the stored address smuggle in extra headers. */
function mailtoHref(email: string): string {
  return `mailto:${email.replace(/[?&#\s]/g, '')}`
}

type SubmissionCardProps = {
  submission: ContactSubmission
  busy: boolean
  onSetStatus: (status: SubmissionStatus) => void
  onSaveNotes: (notes: string | null) => void
  onDelete: () => void
}

function SubmissionCard({
  submission,
  busy,
  onSetStatus,
  onSaveNotes,
  onDelete,
}: SubmissionCardProps) {
  const [notes, setNotes] = useState(submission.notes ?? '')
  const notesChanged = notes.trim() !== (submission.notes ?? '')
  const { status } = submission

  return (
    <li className="rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold break-words">{submission.name}</p>
            <Badge tone={STATUS_TONES[status]}>{copy.status[status]}</Badge>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="sr-only">{copy.company}:</span>
              {submission.company ?? copy.noCompany}
            </span>
            <a
              href={mailtoHref(submission.email)}
              className="inline-flex items-center gap-1.5 break-all underline-offset-4 hover:text-fg hover:underline"
            >
              <Mail aria-hidden="true" className="size-3.5 shrink-0" />
              {submission.email}
            </a>
          </p>
        </div>
        <time dateTime={submission.created_at} className="text-xs font-medium text-subtle">
          <span className="sr-only">{copy.received}: </span>
          {formatDateTime(submission.created_at)}
        </time>
      </div>

      <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed break-words whitespace-pre-line">
        {submission.message}
      </p>

      <div className="mt-4">
        <TextAreaField
          label={copy.notes}
          rows={2}
          maxLength={4000}
          placeholder={copy.notesPlaceholder}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {notesChanged && (
          <Button size="sm" loading={busy} onClick={() => onSaveNotes(emptyToNull(notes))}>
            {copy.saveNotes}
          </Button>
        )}

        <ButtonLink href={mailtoHref(submission.email)} variant="secondary" size="sm">
          <Mail aria-hidden="true" className="size-4" />
          {copy.reply}
        </ButtonLink>

        {status === 'new' && (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => onSetStatus('read')}>
            <MailCheck aria-hidden="true" className="size-4" />
            {copy.markRead}
          </Button>
        )}
        {status === 'read' && (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => onSetStatus('new')}>
            <MailOpen aria-hidden="true" className="size-4" />
            {copy.markNew}
          </Button>
        )}
        {status === 'archived' ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => onSetStatus('read')}>
            <ArchiveRestore aria-hidden="true" className="size-4" />
            {copy.unarchive}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onSetStatus('archived')}>
            <Archive aria-hidden="true" className="size-4" />
            {copy.archive}
          </Button>
        )}

        <Button variant="ghost" size="sm" className="ml-auto" onClick={onDelete}>
          <Trash2 aria-hidden="true" className="size-4" />
          {t.common.delete}
        </Button>
      </div>
    </li>
  )
}

export function ContactSubmissions() {
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('new')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const submissions = useAsync(`admin:submissions:${filter}`, () => listSubmissions(filter))
  const { busyId, run } = useAdminAction(submissions.reload)

  function confirmDelete(submission: ContactSubmission) {
    setConfirmation({
      title: copy.confirmDeleteTitle,
      text: copy.confirmDeleteText(submission.name),
      confirmLabel: t.common.delete,
      danger: true,
      action: async () => {
        await deleteSubmission(submission.id)
        toast.success(copy.deleted)
        submissions.reload()
      },
    })
  }

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />

      <SegmentedControl
        label={copy.title}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'new', label: copy.status.new },
          { value: 'read', label: copy.status.read },
          { value: 'archived', label: copy.status.archived },
          { value: 'all', label: copy.filterAll },
        ]}
        className="mb-5"
      />

      {submissions.data === undefined && submissions.isLoading && <LoadingBlock />}

      {submissions.data === undefined && submissions.error && (
        <ErrorState
          title={t.errors.unknown}
          error={submissions.error}
          onRetry={submissions.reload}
        />
      )}

      {submissions.data?.length === 0 && <StateMessage icon={Inbox} title={copy.empty} />}

      {submissions.data && submissions.data.length > 0 && (
        <ul className="flex flex-col gap-4">
          {submissions.data.map((submission) => (
            <SubmissionCard
              // Remount when the stored notes change so the editor shows the saved value.
              key={`${submission.id}:${submission.updated_at}`}
              submission={submission}
              busy={busyId === submission.id}
              onSetStatus={(status) =>
                void run(
                  submission.id,
                  () => updateSubmission(submission.id, { status }),
                  copy.statusChanged,
                )
              }
              onSaveNotes={(notes) =>
                void run(
                  submission.id,
                  () => updateSubmission(submission.id, { notes }),
                  copy.notesSaved,
                )
              }
              onDelete={() => confirmDelete(submission)}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </>
  )
}
