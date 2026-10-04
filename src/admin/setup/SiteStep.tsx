import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { errorMessage } from '@/lib/errors'
import { emptyToNull, isEmail, isHttpUrl } from '@/lib/validation'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { updateSiteSettings } from '@/services/settings'
import { FormError } from '../components/FormError'

const copy = t.admin.setup.site
const rules = t.admin.validation

type Values = { display_name: string; tagline: string; business_email: string; twitch_url: string }
type Errors = Partial<Record<keyof Values, string>>

/** Step 2: the handful of settings most sites want to change right away. */
export function SiteStep({ onDone }: { onDone: () => void }) {
  const { settings, baseConfig, setSettings } = useSiteConfig()
  const [values, setValues] = useState<Values>({
    display_name: settings?.display_name ?? '',
    tagline: settings?.tagline ?? '',
    business_email: settings?.business_email ?? '',
    twitch_url: settings?.twitch_url ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof Values, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Errors = {}
    const email = values.business_email.trim()
    const twitch = values.twitch_url.trim()
    if (email !== '' && !isEmail(email)) nextErrors.business_email = rules.email
    if (twitch !== '' && !isHttpUrl(twitch)) nextErrors.twitch_url = rules.url
    setErrors(nextErrors)
    setError(null)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      setSettings(
        await updateSiteSettings({
          display_name: emptyToNull(values.display_name),
          tagline: emptyToNull(values.tagline),
          business_email: emptyToNull(values.business_email),
          twitch_url: emptyToNull(values.twitch_url),
        }),
      )
      onDone()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted">{copy.hint}</p>
      <TextField
        label={copy.displayName}
        optional
        maxLength={80}
        placeholder={baseConfig.displayName}
        value={values.display_name}
        onChange={(event) => set('display_name', event.target.value)}
      />
      <TextField
        label={copy.tagline}
        optional
        maxLength={160}
        placeholder={baseConfig.tagline}
        value={values.tagline}
        onChange={(event) => set('tagline', event.target.value)}
      />
      <TextField
        label={copy.businessEmail}
        optional
        type="email"
        inputMode="email"
        placeholder={baseConfig.businessEmail || 'koostoo@example.com'}
        value={values.business_email}
        error={errors.business_email}
        onChange={(event) => set('business_email', event.target.value)}
      />
      <TextField
        label={copy.twitchUrl}
        optional
        type="url"
        inputMode="url"
        placeholder={baseConfig.socials.twitch || 'https://www.twitch.tv/…'}
        value={values.twitch_url}
        error={errors.twitch_url}
        onChange={(event) => set('twitch_url', event.target.value)}
      />

      {error && <FormError message={error} />}

      <div className="mt-2 flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onDone} disabled={busy}>
          {copy.skip}
        </Button>
        <Button type="submit" loading={busy}>
          {copy.next}
        </Button>
      </div>
    </form>
  )
}
