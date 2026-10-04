import { X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import {
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
  swatchClasses,
} from '@/components/ui/Field'
import { normalizeHex } from '@/config/theme'
import { TIME_ZONE, isoToLocalInput, localInputToIso } from '@/lib/datetime'
import { errorMessage } from '@/lib/errors'
import { emptyToNull, isHttpUrl } from '@/lib/validation'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { createEvent, updateEvent } from '@/services/calendar'
import type { CalendarEvent, CalendarEventInput, EventType } from '@/types/database'
import { FormError } from './components/FormError'
import { ImageField } from './components/ImageField'

const copy = t.admin.calendar
const fields = copy.fields
const rules = t.admin.validation

const EVENT_TYPES: EventType[] = ['stream', 'casino', 'giveaway', 'tournament', 'special', 'other']

type Values = {
  title: string
  brand_name: string
  brand_logo: string
  description: string
  /** datetime-local value in the site time zone */
  start_at: string
  end_at: string
  event_type: EventType
  is_sponsored: boolean
  cta_url: string
  /** '' = no custom colour */
  color: string
  is_visible: boolean
}

type Errors = Partial<Record<keyof Values, string>>

function toValues(event: CalendarEvent | null): Values {
  return {
    title: event?.title ?? '',
    brand_name: event?.brand_name ?? '',
    brand_logo: event?.brand_logo ?? '',
    description: event?.description ?? '',
    start_at: isoToLocalInput(event?.start_at),
    end_at: isoToLocalInput(event?.end_at),
    event_type: event?.event_type ?? 'stream',
    is_sponsored: event?.is_sponsored ?? false,
    cta_url: event?.cta_url ?? '',
    color: event?.color ?? '',
    is_visible: event?.is_visible ?? true,
  }
}

function validate(values: Values): Errors {
  const errors: Errors = {}

  if (values.title.trim() === '') errors.title = rules.required

  const start = localInputToIso(values.start_at)
  const end = values.end_at === '' ? null : localInputToIso(values.end_at)
  if (values.start_at === '') errors.start_at = rules.required
  else if (!start) errors.start_at = rules.dateTime
  if (values.end_at !== '' && !end) errors.end_at = rules.dateTime
  if (start && end && end < start) errors.end_at = rules.endBeforeStart

  for (const key of ['brand_logo', 'cta_url'] as const) {
    const value = values[key].trim()
    if (value !== '' && !isHttpUrl(value)) errors[key] = rules.url
  }

  if (values.color !== '' && !normalizeHex(values.color)) errors.color = rules.hexColor

  return errors
}

function toInput(values: Values): CalendarEventInput {
  return {
    title: values.title.trim(),
    brand_name: emptyToNull(values.brand_name),
    brand_logo: emptyToNull(values.brand_logo),
    description: emptyToNull(values.description),
    // validate() has already guaranteed a parseable start.
    start_at: localInputToIso(values.start_at) ?? '',
    end_at: values.end_at === '' ? null : localInputToIso(values.end_at),
    event_type: values.event_type,
    is_sponsored: values.is_sponsored,
    cta_url: emptyToNull(values.cta_url),
    color: normalizeHex(values.color),
    is_visible: values.is_visible,
  }
}

type CalendarEventEditorProps = {
  /** The event to edit, or null to create a new one. */
  event: CalendarEvent | null
  onClose: () => void
  onSaved: () => void
}

/** Create / edit form for a calendar event. Mount it to open the dialog; unmount to close. */
export function CalendarEventEditor({ event, onClose, onSaved }: CalendarEventEditorProps) {
  const formId = useId()
  const colorId = useId()
  const { config } = useSiteConfig()
  const [values, setValues] = useState(() => toValues(event))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    setSaveError(null)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const input = toInput(values)
      if (event) await updateEvent(event.id, input)
      else await createEvent(input)
      onSaved()
    } catch (error) {
      setSaveError(errorMessage(error))
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      busy={saving}
      closeOnBackdrop={false}
      size="lg"
      title={event ? copy.editTitle : copy.newTitle}
      description={copy.subtitle(TIME_ZONE)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {saving ? t.common.saving : t.common.save}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(submitEvent) => void handleSubmit(submitEvent)}
        noValidate
        className="grid grid-cols-1 gap-5 sm:grid-cols-2"
      >
        <TextField
          label={fields.title}
          required
          maxLength={120}
          value={values.title}
          error={errors.title}
          onChange={(e) => set('title', e.target.value)}
          className="sm:col-span-2"
        />

        <TextField
          label={fields.startAt}
          required
          type="datetime-local"
          value={values.start_at}
          error={errors.start_at}
          onChange={(e) => set('start_at', e.target.value)}
        />
        <TextField
          label={fields.endAt}
          optional
          type="datetime-local"
          value={values.end_at}
          error={errors.end_at}
          onChange={(e) => set('end_at', e.target.value)}
        />

        <SelectField
          label={fields.eventType}
          value={values.event_type}
          onChange={(e) => set('event_type', e.target.value as EventType)}
          options={EVENT_TYPES.map((type) => ({
            value: type,
            label: t.calendar.eventTypes[type],
          }))}
        />
        <TextField
          label={fields.brandName}
          optional
          maxLength={80}
          value={values.brand_name}
          error={errors.brand_name}
          onChange={(e) => set('brand_name', e.target.value)}
        />

        <TextAreaField
          label={fields.description}
          optional
          rows={3}
          maxLength={2000}
          value={values.description}
          error={errors.description}
          onChange={(e) => set('description', e.target.value)}
          className="sm:col-span-2"
        />

        <TextField
          label={fields.ctaUrl}
          optional
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={values.cta_url}
          error={errors.cta_url}
          onChange={(e) => set('cta_url', e.target.value)}
        />
        <ImageField
          label={fields.brandLogo}
          folder="events"
          value={values.brand_logo}
          error={errors.brand_logo}
          onChange={(value) => set('brand_logo', value)}
        />

        <SwitchField
          label={fields.isSponsored}
          hint={fields.isSponsoredHint}
          checked={values.is_sponsored}
          onChange={(checked) => set('is_sponsored', checked)}
        />
        <SwitchField
          label={fields.isVisible}
          checked={values.is_visible}
          onChange={(checked) => set('is_visible', checked)}
        />

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={colorId} className="text-sm font-semibold">
            {fields.color}
            <span className="ml-1.5 font-normal text-subtle">({t.common.optional})</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              id={colorId}
              type="color"
              // A colour input always needs a value; show the theme colour until one is chosen.
              value={normalizeHex(values.color) ?? config.theme.primary}
              onChange={(e) => set('color', e.target.value)}
              aria-describedby={`${colorId}-hint`}
              className={swatchClasses}
            />
            <span className="font-mono text-sm text-muted">{values.color || '—'}</span>
            {values.color !== '' && (
              <Button variant="ghost" size="sm" onClick={() => set('color', '')}>
                <X aria-hidden="true" className="size-4" />
                {fields.clearColor}
              </Button>
            )}
          </div>
          <p id={`${colorId}-hint`} className="text-xs text-subtle">
            {errors.color ?? fields.colorHint}
          </p>
        </div>

        {saveError && <FormError className="sm:col-span-2" message={saveError} />}
      </form>
    </Dialog>
  )
}
