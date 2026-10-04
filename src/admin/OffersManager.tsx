import { Archive, ArchiveRestore, Eye, EyeOff, Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { BrandMark } from '@/components/ui/BrandMark'
import { Button } from '@/components/ui/Button'
import { LoadingBlock } from '@/components/ui/Spinner'
import { ErrorState, StateMessage } from '@/components/ui/StateMessage'
import { useToast } from '@/components/ui/toast-context'
import { useAsync } from '@/hooks/useAsync'
import { offerStatus, offerValidityLabel, type OfferStatus } from '@/lib/offers'
import { t } from '@/locales'
import {
  archiveOffer,
  deleteOffer,
  listOffers,
  restoreOffer,
  setOfferActive,
} from '@/services/offers'
import type { Offer } from '@/types/database'
import { ConfirmDialog, type Confirmation } from './components/ConfirmDialog'
import { PageHeader } from './components/PageHeader'
import { SegmentedControl } from './components/SegmentedControl'
import { useAdminAction } from './hooks/useAdminAction'
import { OfferEditor } from './OfferEditor'

const copy = t.admin.offers

type Scope = 'current' | 'archived'

/** `null` offer = create a new one. */
type EditorState = { offer: Offer | null }

const STATUS_TONES: Record<OfferStatus, BadgeTone> = {
  live: 'success',
  inactive: 'neutral',
  scheduled: 'primary',
  expired: 'warning',
  archived: 'neutral',
}

export function OffersManager() {
  const location = useLocation()
  const toast = useToast()
  const [scope, setScope] = useState<Scope>('current')
  const [editor, setEditor] = useState<EditorState | null>(() =>
    // The dashboard's "Add offer" shortcut arrives with this navigation state.
    (location.state as { create?: boolean } | null)?.create ? { offer: null } : null,
  )
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const offers = useAsync(`admin:offers:${scope}`, () => listOffers(scope))
  const { busyId, run } = useAdminAction(offers.reload)

  function confirmArchive(offer: Offer) {
    setConfirmation({
      title: copy.confirmArchiveTitle,
      text: copy.confirmArchiveText(offer.title),
      confirmLabel: copy.archive,
      action: async () => {
        await archiveOffer(offer.id)
        toast.success(copy.archived)
        offers.reload()
      },
    })
  }

  function confirmDelete(offer: Offer) {
    setConfirmation({
      title: copy.confirmDeleteTitle,
      text: copy.confirmDeleteText(offer.title),
      confirmLabel: copy.deleteForever,
      danger: true,
      action: async () => {
        await deleteOffer(offer.id)
        toast.success(copy.deleted)
        offers.reload()
      },
    })
  }

  return (
    <>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        action={
          <Button onClick={() => setEditor({ offer: null })}>
            <Plus aria-hidden="true" className="size-4" />
            {copy.add}
          </Button>
        }
      />

      <SegmentedControl
        label={copy.title}
        value={scope}
        onChange={setScope}
        options={[
          { value: 'current', label: copy.tabActive },
          { value: 'archived', label: copy.tabArchived },
        ]}
        className="mb-5"
      />

      {offers.data === undefined && offers.isLoading && <LoadingBlock />}

      {offers.data === undefined && offers.error && (
        <ErrorState title={t.offers.errorTitle} error={offers.error} onRetry={offers.reload} />
      )}

      {offers.data?.length === 0 && (
        <StateMessage icon={Tag} title={scope === 'current' ? copy.empty : copy.emptyArchived} />
      )}

      {offers.data && offers.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {offers.data.map((offer) => {
            const status = offerStatus(offer)
            const busy = busyId === offer.id

            return (
              <li
                key={offer.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-line bg-surface p-4"
              >
                <BrandMark name={offer.brand_name} logo={offer.brand_logo} />

                <div className="min-w-0 flex-1 basis-60">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate font-semibold">{offer.title}</p>
                    <Badge tone={STATUS_TONES[status]}>{copy.status[status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {offer.brand_name} · {offerValidityLabel(offer)} ·{' '}
                    {copy.sortOrderLabel(offer.sort_order)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {scope === 'current' ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={busy}
                        onClick={() =>
                          void run(
                            offer.id,
                            () => setOfferActive(offer.id, !offer.is_active),
                            offer.is_active ? copy.deactivated : copy.activated,
                          )
                        }
                      >
                        {!busy &&
                          (offer.is_active ? (
                            <EyeOff aria-hidden="true" className="size-4" />
                          ) : (
                            <Eye aria-hidden="true" className="size-4" />
                          ))}
                        {offer.is_active ? copy.deactivate : copy.activate}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setEditor({ offer })}>
                        <Pencil aria-hidden="true" className="size-4" />
                        {t.common.edit}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => confirmArchive(offer)}>
                        <Archive aria-hidden="true" className="size-4" />
                        {copy.archive}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={busy}
                        onClick={() =>
                          void run(offer.id, () => restoreOffer(offer.id), copy.restored)
                        }
                      >
                        {!busy && <ArchiveRestore aria-hidden="true" className="size-4" />}
                        {copy.restore}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => confirmDelete(offer)}>
                        <Trash2 aria-hidden="true" className="size-4" />
                        {copy.deleteForever}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editor && (
        <OfferEditor
          key={editor.offer?.id ?? 'new'}
          offer={editor.offer}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            toast.success(copy.saved)
            offers.reload()
          }}
        />
      )}

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </>
  )
}
