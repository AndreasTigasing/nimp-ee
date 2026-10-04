import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { errorMessage } from '@/lib/errors'
import { t } from '@/locales'
import { FormError } from './FormError'

export type Confirmation = {
  title: string
  text: string
  confirmLabel: string
  /** Styles the confirm button as destructive. */
  danger?: boolean
  /** The action to run. Rejecting keeps the dialog open and shows the error. */
  action: () => Promise<void>
}

type ConfirmDialogProps = {
  /** The pending confirmation, or null when closed. */
  confirmation: Confirmation | null
  onClose: () => void
}

/** "Are you sure?" dialog for destructive or hard-to-undo actions. */
export function ConfirmDialog({ confirmation, onClose }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setError(null)
    onClose()
  }

  async function confirm() {
    if (!confirmation) return
    setBusy(true)
    setError(null)
    try {
      await confirmation.action()
      onClose()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={confirmation !== null}
      onClose={close}
      busy={busy}
      size="sm"
      title={confirmation?.title ?? ''}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            {t.common.cancel}
          </Button>
          <Button
            variant={confirmation?.danger ? 'danger' : 'primary'}
            loading={busy}
            onClick={() => void confirm()}
          >
            {confirmation?.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted">{confirmation?.text}</p>
      {error && <FormError className="mt-4" message={error} />}
    </Dialog>
  )
}
