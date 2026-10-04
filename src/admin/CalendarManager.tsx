import { CalendarDays, Eye, EyeOff, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingBlock } from '@/components/ui/Spinner'
import { ErrorState, StateMessage } from '@/components/ui/StateMessage'
import { useToast } from '@/components/ui/toast-context'
import { useAsync } from '@/hooks/useAsync'
import { TIME_ZONE, formatTimeRange, formatZoned } from '@/lib/datetime'
import { t } from '@/locales'
import { deleteEvent, listEvents, setEventVisible } from '@/services/calendar'
import type { CalendarEvent } from '@/types/database'
import { CalendarEventEditor } from './CalendarEventEditor'
import { ConfirmDialog, type Confirmation } from './components/ConfirmDialog'
import { PageHeader } from './components/PageHeader'
import { SegmentedControl } from './components/SegmentedControl'
import { useAdminAction } from './hooks/useAdminAction'

const copy = t.admin.calendar

type Scope = 'upcoming' | 'past'

/** `null` event = create a new one. */
type EditorState = { event: CalendarEvent | null }

export function CalendarManager() {
  const location = useLocation()
  const toast = useToast()
  const [scope, setScope] = useState<Scope>('upcoming')
  const [editor, setEditor] = useState<EditorState | null>(() =>
    // The dashboard's "Add event" shortcut arrives with this navigation state.
    (location.state as { create?: boolean } | null)?.create ? { event: null } : null,
  )
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const events = useAsync(`admin:events:${scope}`, () => listEvents(scope))
  const { busyId, run } = useAdminAction(events.reload)

  function confirmDelete(event: CalendarEvent) {
    setConfirmation({
      title: copy.confirmDeleteTitle,
      text: copy.confirmDeleteText(event.title),
      confirmLabel: t.common.delete,
      danger: true,
      action: async () => {
        await deleteEvent(event.id)
        toast.success(copy.deleted)
        events.reload()
      },
    })
  }

  return (
    <>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle(TIME_ZONE)}
        action={
          <Button onClick={() => setEditor({ event: null })}>
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
          { value: 'upcoming', label: copy.tabUpcoming },
          { value: 'past', label: copy.tabPast },
        ]}
        className="mb-5"
      />

      {events.data === undefined && events.isLoading && <LoadingBlock />}

      {events.data === undefined && events.error && (
        <ErrorState title={t.calendar.errorTitle} error={events.error} onRetry={events.reload} />
      )}

      {events.data?.length === 0 && (
        <StateMessage
          icon={CalendarDays}
          title={scope === 'upcoming' ? copy.empty : copy.emptyPast}
        />
      )}

      {events.data && events.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {events.data.map((event) => {
            const busy = busyId === event.id

            return (
              <li
                key={event.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card border border-line bg-surface p-4"
              >
                <time
                  dateTime={event.start_at}
                  className="flex w-14 shrink-0 flex-col items-center rounded-2xl border border-line-strong bg-fg/5 py-2"
                >
                  <span className="text-[0.6875rem] leading-none font-bold text-subtle uppercase">
                    {formatZoned(event.start_at, 'LLL')}
                  </span>
                  <span className="mt-1 font-display text-xl leading-none font-bold">
                    {formatZoned(event.start_at, 'd')}
                  </span>
                </time>

                <div className="min-w-0 flex-1 basis-60">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 truncate font-semibold">{event.title}</p>
                    <Badge tone={event.is_visible ? 'success' : 'neutral'}>
                      {event.is_visible ? copy.visible : copy.hidden}
                    </Badge>
                    {event.is_sponsored && (
                      <Badge tone="accent">
                        <Star aria-hidden="true" className="size-3 fill-current" />
                        {t.calendar.sponsored}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatZoned(event.start_at, 'EEEEEE dd.MM.yyyy')} ·{' '}
                    {formatTimeRange(event.start_at, event.end_at)} ·{' '}
                    {t.calendar.eventTypes[event.event_type]}
                    {event.brand_name && ` · ${event.brand_name}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={busy}
                    onClick={() =>
                      void run(
                        event.id,
                        () => setEventVisible(event.id, !event.is_visible),
                        event.is_visible ? copy.hiddenToast : copy.shown,
                      )
                    }
                  >
                    {!busy &&
                      (event.is_visible ? (
                        <EyeOff aria-hidden="true" className="size-4" />
                      ) : (
                        <Eye aria-hidden="true" className="size-4" />
                      ))}
                    {event.is_visible ? copy.hide : copy.show}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditor({ event })}>
                    <Pencil aria-hidden="true" className="size-4" />
                    {t.common.edit}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => confirmDelete(event)}>
                    <Trash2 aria-hidden="true" className="size-4" />
                    {t.common.delete}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editor && (
        <CalendarEventEditor
          key={editor.event?.id ?? 'new'}
          event={editor.event}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null)
            toast.success(copy.saved)
            events.reload()
          }}
        />
      )}

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </>
  )
}
