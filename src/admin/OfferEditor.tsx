import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SwitchField, TextAreaField, TextField } from '@/components/ui/Field'
import { TIME_ZONE, isoToLocalInput, localInputToIso } from '@/lib/datetime'
import { errorMessage } from '@/lib/errors'
import { emptyToNull, isHttpUrl } from '@/lib/validation'
import { t } from '@/locales'
import { createOffer, updateOffer } from '@/services/offers'
import type { Offer, OfferInput } from '@/types/database'
import { FormError } from './components/FormError'
import { ImageField } from './components/ImageField'

const copy = t.admin.offers
const fields = copy.fields
const rules = t.admin.validation

type Values = {
  title: string
  brand_name: string
  brand_logo: string
  image: string
  short_description: string
  description: string
  cta_text: string
  cta_url: string
  promo_code: string
  terms: string
  label: string
  /** datetime-local value in the site time zone */
  valid_from: string
  valid_until: string
  is_active: boolean
  show_after_expiry: boolean
  show_validity: boolean
  sort_order: string
}

type Errors = Partial<Record<keyof Values, string>>

function toValues(offer: Offer | null): Values {
  return {
    title: offer?.title ?? '',
    brand_name: offer?.brand_name ?? '',
    brand_logo: offer?.brand_logo ?? '',
    image: offer?.image ?? '',
    short_description: offer?.short_description ?? '',
    description: offer?.description ?? '',
    cta_text: offer?.cta_text ?? '',
    cta_url: offer?.cta_url ?? '',
    promo_code: offer?.promo_code ?? '',
    terms: offer?.terms ?? '',
    label: offer?.label ?? '',
    valid_from: isoToLocalInput(offer?.valid_from),
    valid_until: isoToLocalInput(offer?.valid_until),
    is_active: offer?.is_active ?? true,
    show_after_expiry: offer?.show_after_expiry ?? false,
    show_validity: offer?.show_validity ?? true,
    sort_order: String(offer?.sort_order ?? 0),
  }
}

function validate(values: Values): Errors {
  const errors: Errors = {}

  if (values.title.trim() === '') errors.title = rules.required
  if (values.brand_name.trim() === '') errors.brand_name = rules.required

  for (const key of ['brand_logo', 'image', 'cta_url'] as const) {
    const value = values[key].trim()
    if (value !== '' && !isHttpUrl(value)) errors[key] = rules.url
  }

  const from = values.valid_from === '' ? null : localInputToIso(values.valid_from)
  const until = values.valid_until === '' ? null : localInputToIso(values.valid_until)
  if (values.valid_from !== '' && !from) errors.valid_from = rules.dateTime
  if (values.valid_until !== '' && !until) errors.valid_until = rules.dateTime
  if (from && until && until <= from) errors.valid_until = rules.endBeforeStart

  if (!/^-?\d{1,6}$/.test(values.sort_order.trim())) errors.sort_order = rules.number

  return errors
}

function toInput(values: Values): OfferInput {
  return {
    title: values.title.trim(),
    brand_name: values.brand_name.trim(),
    brand_logo: emptyToNull(values.brand_logo),
    image: emptyToNull(values.image),
    short_description: emptyToNull(values.short_description),
    description: emptyToNull(values.description),
    cta_text: emptyToNull(values.cta_text),
    cta_url: emptyToNull(values.cta_url),
    promo_code: emptyToNull(values.promo_code),
    terms: emptyToNull(values.terms),
    label: emptyToNull(values.label),
    valid_from: values.valid_from === '' ? null : localInputToIso(values.valid_from),
    valid_until: values.valid_until === '' ? null : localInputToIso(values.valid_until),
    is_active: values.is_active,
    show_after_expiry: values.show_after_expiry,
    show_validity: values.show_validity,
    sort_order: Number.parseInt(values.sort_order, 10),
  }
}

type OfferEditorProps = {
  /** The offer to edit, or null to create a new one. */
  offer: Offer | null
  onClose: () => void
  onSaved: () => void
}

/** Create / edit form for an offer. Mount it to open the dialog; unmount to close. */
export function OfferEditor({ offer, onClose, onSaved }: OfferEditorProps) {
  const formId = useId()
  const [values, setValues] = useState(() => toValues(offer))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    setSaveError(null)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const input = toInput(values)
      if (offer) await updateOffer(offer.id, input)
      else await createOffer(input)
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
      title={offer ? copy.editTitle : copy.newTitle}
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
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="grid grid-cols-1 gap-5 sm:grid-cols-2"
      >
        <TextField
          label={fields.title}
          required
          maxLength={120}
          value={values.title}
          error={errors.title}
          onChange={(event) => set('title', event.target.value)}
          className="sm:col-span-2"
        />
        <TextField
          label={fields.brandName}
          required
          maxLength={80}
          value={values.brand_name}
          error={errors.brand_name}
          onChange={(event) => set('brand_name', event.target.value)}
        />
        <TextField
          label={fields.label}
          hint={fields.labelHint}
          optional
          maxLength={40}
          placeholder={t.offers.sponsoredNote}
          value={values.label}
          error={errors.label}
          onChange={(event) => set('label', event.target.value)}
        />

        <ImageField
          label={fields.brandLogo}
          folder="offers"
          value={values.brand_logo}
          error={errors.brand_logo}
          onChange={(value) => set('brand_logo', value)}
        />
        <ImageField
          label={fields.image}
          folder="offers"
          value={values.image}
          error={errors.image}
          onChange={(value) => set('image', value)}
        />

        <TextAreaField
          label={fields.shortDescription}
          hint={fields.shortDescriptionHint}
          optional
          rows={2}
          maxLength={280}
          value={values.short_description}
          error={errors.short_description}
          onChange={(event) => set('short_description', event.target.value)}
          className="sm:col-span-2"
        />
        <TextAreaField
          label={fields.description}
          hint={fields.descriptionHint}
          optional
          rows={5}
          maxLength={4000}
          value={values.description}
          error={errors.description}
          onChange={(event) => set('description', event.target.value)}
          className="sm:col-span-2"
        />

        <TextField
          label={fields.promoCode}
          optional
          maxLength={40}
          value={values.promo_code}
          error={errors.promo_code}
          onChange={(event) => set('promo_code', event.target.value)}
        />
        <TextField
          label={fields.ctaText}
          hint={fields.ctaTextHint}
          optional
          maxLength={40}
          value={values.cta_text}
          error={errors.cta_text}
          onChange={(event) => set('cta_text', event.target.value)}
        />
        <TextField
          label={fields.ctaUrl}
          optional
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={values.cta_url}
          error={errors.cta_url}
          onChange={(event) => set('cta_url', event.target.value)}
          className="sm:col-span-2"
        />

        <TextAreaField
          label={fields.terms}
          optional
          rows={3}
          maxLength={4000}
          value={values.terms}
          error={errors.terms}
          onChange={(event) => set('terms', event.target.value)}
          className="sm:col-span-2"
        />

        <TextField
          label={fields.validFrom}
          hint={`${fields.validHint} (${TIME_ZONE})`}
          optional
          type="datetime-local"
          value={values.valid_from}
          error={errors.valid_from}
          onChange={(event) => set('valid_from', event.target.value)}
        />
        <TextField
          label={fields.validUntil}
          hint={`${fields.validHint} (${TIME_ZONE})`}
          optional
          type="datetime-local"
          value={values.valid_until}
          error={errors.valid_until}
          onChange={(event) => set('valid_until', event.target.value)}
        />

        <SwitchField
          label={fields.showValidity}
          hint={fields.showValidityHint}
          checked={values.show_validity}
          onChange={(checked) => set('show_validity', checked)}
        />
        <SwitchField
          label={fields.showAfterExpiry}
          hint={fields.showAfterExpiryHint}
          checked={values.show_after_expiry}
          onChange={(checked) => set('show_after_expiry', checked)}
        />
        <SwitchField
          label={fields.isActive}
          hint={fields.isActiveHint}
          checked={values.is_active}
          onChange={(checked) => set('is_active', checked)}
        />

        <TextField
          label={fields.sortOrder}
          hint={fields.sortOrderHint}
          type="number"
          inputMode="numeric"
          step={1}
          value={values.sort_order}
          error={errors.sort_order}
          onChange={(event) => set('sort_order', event.target.value)}
        />

        {saveError && <FormError className="sm:col-span-2" message={saveError} />}
      </form>
    </Dialog>
  )
}
