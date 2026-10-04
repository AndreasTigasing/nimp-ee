import { RotateCcw, Star, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/button-styles'
import {
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
  controlClasses,
  swatchClasses,
} from '@/components/ui/Field'
import { LoadingBlock } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/toast-context'
import { env } from '@/config/env'
import { applySiteSettings } from '@/config/merge'
import { resolveSections } from '@/config/sections'
import { contrastRatio, mergePalette, normalizeHex } from '@/config/theme'
import {
  HEADER_ACTIONS,
  SOCIAL_PLATFORMS,
  type HeaderAction,
  type SectionSetting,
  type SocialPlatform,
  type StreamerConfig,
  type ThemePalette,
} from '@/config/types'
import { applyPalette } from '@/lib/apply-theme'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { emptyToNull, isEmail, isHttpUrl } from '@/lib/validation'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { updateSiteSettings } from '@/services/settings'
import type { SiteSettings, SiteSettingsInput } from '@/types/database'
import { FormError } from './components/FormError'
import { ImageField } from './components/ImageField'
import { PageHeader } from './components/PageHeader'
import { SectionOrderEditor } from './components/SectionOrderEditor'

const copy = t.admin.settings
const rules = t.admin.validation

const PALETTE_KEYS = ['primary', 'accent', 'background', 'surface', 'text'] as const
type PaletteKey = (typeof PALETTE_KEYS)[number]

const MAX_TAGS = 12

/** Every value is a string; '' means "not set — use the code/env default". */
type Values = {
  display_name: string
  tagline: string
  profile_image_url: string
  business_email: string
  about_text: string
  tags: string
  hero_lead: string
  twitch_cta_title: string
  footer_text: string
  socials: Record<SocialPlatform, string>
  theme: Record<PaletteKey, string>
  /** Home-page sections in display order. */
  sections: SectionSetting[]
  twitch_embed: boolean
  header_action: HeaderAction
  hero_twitch_button: boolean
  hero_collab_button: boolean
  hero_offers: boolean
  hero_next_event: boolean
}

type ErrorKey = Exclude<keyof Values, 'socials' | 'theme'> | SocialPlatform | PaletteKey
type Errors = Partial<Record<ErrorKey, string>>

function toValues(settings: SiteSettings | null, base: StreamerConfig): Values {
  return {
    display_name: settings?.display_name ?? '',
    tagline: settings?.tagline ?? '',
    profile_image_url: settings?.profile_image_url ?? '',
    business_email: settings?.business_email ?? '',
    about_text: settings?.about_text ?? '',
    tags: settings?.tags?.join(', ') ?? '',
    hero_lead: settings?.hero_lead ?? '',
    twitch_cta_title: settings?.twitch_cta_title ?? '',
    footer_text: settings?.footer_text ?? '',
    socials: {
      twitch: settings?.twitch_url ?? '',
      instagram: settings?.instagram_url ?? '',
      youtube: settings?.youtube_url ?? '',
      tiktok: settings?.tiktok_url ?? '',
      discord: settings?.discord_url ?? '',
      facebook: settings?.facebook_url ?? '',
      x: settings?.x_url ?? '',
      steam: settings?.steam_url ?? '',
    },
    theme: {
      primary: settings?.theme_primary ?? '',
      accent: settings?.theme_accent ?? '',
      background: settings?.theme_background ?? '',
      surface: settings?.theme_surface ?? '',
      text: settings?.theme_text ?? '',
    },
    sections: resolveSections(base.sections, settings?.section_order, settings?.hidden_sections),
    twitch_embed: settings?.twitch_embed_enabled ?? base.twitchEmbed,
    header_action: applySiteSettings(base, settings).headerAction,
    hero_twitch_button: settings?.hero_show_twitch_button ?? base.heroButtons.twitch,
    hero_collab_button: settings?.hero_show_collab_button ?? base.heroButtons.collaboration,
    hero_offers: settings?.hero_show_offers ?? base.heroTeasers.offers,
    hero_next_event: settings?.hero_show_next_event ?? base.heroTeasers.nextEvent,
  }
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function validate(values: Values): Errors {
  const errors: Errors = {}

  const email = values.business_email.trim()
  if (email !== '' && !isEmail(email)) errors.business_email = rules.email

  const image = values.profile_image_url.trim()
  if (image !== '' && !isHttpUrl(image)) errors.profile_image_url = rules.url

  if (parseTags(values.tags).length > MAX_TAGS) errors.tags = rules.tooLong(MAX_TAGS)

  for (const platform of SOCIAL_PLATFORMS) {
    const url = values.socials[platform].trim()
    if (url !== '' && !isHttpUrl(url)) errors[platform] = rules.url
  }

  for (const key of PALETTE_KEYS) {
    const color = values.theme[key].trim()
    if (color !== '' && !normalizeHex(color)) errors[key] = rules.hexColor
  }

  return errors
}

function toInput(values: Values): SiteSettingsInput {
  const tags = parseTags(values.tags)
  return {
    display_name: emptyToNull(values.display_name),
    tagline: emptyToNull(values.tagline),
    profile_image_url: emptyToNull(values.profile_image_url),
    business_email: emptyToNull(values.business_email),
    about_text: emptyToNull(values.about_text),
    tags: tags.length > 0 ? tags : null,
    hero_lead: emptyToNull(values.hero_lead),
    twitch_cta_title: emptyToNull(values.twitch_cta_title),
    footer_text: emptyToNull(values.footer_text),
    twitch_url: emptyToNull(values.socials.twitch),
    instagram_url: emptyToNull(values.socials.instagram),
    youtube_url: emptyToNull(values.socials.youtube),
    tiktok_url: emptyToNull(values.socials.tiktok),
    discord_url: emptyToNull(values.socials.discord),
    facebook_url: emptyToNull(values.socials.facebook),
    x_url: emptyToNull(values.socials.x),
    steam_url: emptyToNull(values.socials.steam),
    theme_primary: normalizeHex(values.theme.primary),
    theme_accent: normalizeHex(values.theme.accent),
    theme_background: normalizeHex(values.theme.background),
    theme_surface: normalizeHex(values.theme.surface),
    theme_text: normalizeHex(values.theme.text),
    section_order: values.sections.map((section) => section.id),
    hidden_sections: values.sections
      .filter((section) => !section.visible)
      .map((section) => section.id),
    twitch_embed_enabled: values.twitch_embed,
    header_action: values.header_action,
    hero_show_twitch_button: values.hero_twitch_button,
    hero_show_collab_button: values.hero_collab_button,
    hero_show_offers: values.hero_offers,
    hero_show_next_event: values.hero_next_event,
  }
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}

type ColorFieldProps = {
  label: string
  /** '' = use the default */
  value: string
  fallback: string
  error?: string
  onChange: (value: string) => void
}

function ColorField({ label, value, fallback, error, onChange }: ColorFieldProps) {
  const id = useId()
  const isDefault = value.trim() === ''

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={normalizeHex(value) ?? fallback}
          onChange={(event) => onChange(event.target.value)}
          className={swatchClasses}
        />
        <input
          id={id}
          type="text"
          value={value}
          placeholder={fallback}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-note`}
          onChange={(event) => onChange(event.target.value)}
          className={cn(controlClasses, 'h-12 min-w-0 flex-1 font-mono')}
        />
        <button
          type="button"
          onClick={() => onChange('')}
          disabled={isDefault}
          aria-label={`${copy.theme.reset}: ${label}`}
          title={copy.theme.reset}
          className={buttonClasses({ variant: 'ghost', size: 'icon', className: 'size-12' })}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      </div>
      <p
        id={`${id}-note`}
        className={cn('text-xs', error ? 'font-medium text-danger' : 'text-subtle')}
      >
        {error ?? (isDefault ? copy.theme.usingDefault : ' ')}
      </p>
    </div>
  )
}

function SettingsForm({ settings }: { settings: SiteSettings | null }) {
  const toast = useToast()
  const { config, baseConfig, setSettings } = useSiteConfig()
  const [values, setValues] = useState(() => toValues(settings, baseConfig))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function set<K extends Exclude<keyof Values, 'socials' | 'theme'>>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  function setSocial(platform: SocialPlatform, value: string) {
    setValues((current) => ({ ...current, socials: { ...current.socials, [platform]: value } }))
    if (errors[platform]) setErrors((current) => ({ ...current, [platform]: undefined }))
  }

  function setColor(key: PaletteKey, value: string) {
    setValues((current) => ({ ...current, theme: { ...current.theme, [key]: value } }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  // Live preview: the whole page takes the edited palette. Invalid or empty
  // values fall back to the defaults; leaving the page restores the saved theme.
  const previewPalette = useMemo<ThemePalette>(
    () => mergePalette(baseConfig.theme, values.theme),
    [baseConfig.theme, values.theme],
  )
  useEffect(() => {
    applyPalette(previewPalette)
    return () => applyPalette(config.theme)
  }, [previewPalette, config.theme])

  const lowContrast =
    contrastRatio(previewPalette.text, previewPalette.background) < 4.5 ||
    contrastRatio(previewPalette.text, previewPalette.surface) < 4.5

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    setSaveError(null)
    if (Object.keys(nextErrors).length > 0) {
      setSaveError(t.errors.validation)
      return
    }

    setSaving(true)
    try {
      setSettings(await updateSiteSettings(toInput(values)))
      toast.success(copy.saved)
    } catch (error) {
      setSaveError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-5">
      <SettingsCard title={copy.sections.identity}>
        <TextField
          label={copy.fields.displayName}
          optional
          maxLength={80}
          placeholder={baseConfig.displayName}
          value={values.display_name}
          error={errors.display_name}
          onChange={(event) => set('display_name', event.target.value)}
        />
        <TextField
          label={copy.fields.tagline}
          optional
          maxLength={160}
          placeholder={baseConfig.tagline}
          value={values.tagline}
          error={errors.tagline}
          onChange={(event) => set('tagline', event.target.value)}
        />
        <ImageField
          label={copy.fields.profileImage}
          folder="site"
          placeholder={baseConfig.image}
          value={values.profile_image_url}
          error={errors.profile_image_url}
          onChange={(value) => set('profile_image_url', value)}
        />
        <TextField
          label={copy.fields.businessEmail}
          optional
          type="email"
          inputMode="email"
          maxLength={254}
          placeholder={baseConfig.businessEmail || 'koostoo@example.com'}
          value={values.business_email}
          error={errors.business_email}
          onChange={(event) => set('business_email', event.target.value)}
        />
      </SettingsCard>

      <SettingsCard title={copy.sections.content}>
        <TextAreaField
          label={copy.fields.heroLead}
          hint={copy.fields.heroLeadHint}
          optional
          rows={2}
          maxLength={400}
          placeholder={baseConfig.heroLead || t.hero.lead}
          value={values.hero_lead}
          error={errors.hero_lead}
          onChange={(event) => set('hero_lead', event.target.value)}
          className="sm:col-span-2"
        />
        <TextAreaField
          label={copy.fields.aboutText}
          hint={copy.fields.aboutTextHint}
          optional
          rows={6}
          maxLength={4000}
          placeholder={baseConfig.aboutText}
          value={values.about_text}
          error={errors.about_text}
          onChange={(event) => set('about_text', event.target.value)}
          className="sm:col-span-2"
        />
        <TextField
          label={copy.fields.tags}
          hint={copy.fields.tagsHint}
          optional
          placeholder={baseConfig.tags.join(', ')}
          value={values.tags}
          error={errors.tags}
          onChange={(event) => set('tags', event.target.value)}
        />
        <TextField
          label={copy.fields.twitchCtaTitle}
          optional
          maxLength={120}
          placeholder={baseConfig.twitchCtaTitle || t.twitchCta.defaultTitle}
          value={values.twitch_cta_title}
          error={errors.twitch_cta_title}
          onChange={(event) => set('twitch_cta_title', event.target.value)}
        />
        <TextAreaField
          label={copy.fields.footerText}
          hint={copy.fields.footerTextHint}
          optional
          rows={2}
          maxLength={1000}
          placeholder={baseConfig.footerText}
          value={values.footer_text}
          error={errors.footer_text}
          onChange={(event) => set('footer_text', event.target.value)}
          className="sm:col-span-2"
        />
      </SettingsCard>

      <SettingsCard title={copy.sections.layout}>
        <p className="text-sm text-muted sm:col-span-2">
          {copy.layout.hint} {copy.layout.calendarHint}
        </p>
        <div className="sm:col-span-2">
          <SectionOrderEditor
            sections={values.sections}
            onChange={(sections) => set('sections', sections)}
          />
        </div>
        <div className="sm:col-span-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => set('sections', baseConfig.sections)}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {copy.layout.reset}
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title={copy.sections.buttons}>
        <SelectField
          label={copy.buttons.headerAction}
          hint={copy.buttons.headerActionHint}
          value={values.header_action}
          onChange={(event) => set('header_action', event.target.value as HeaderAction)}
          options={HEADER_ACTIONS.map((action) => ({
            value: action,
            label: copy.buttons.headerActions[action],
          }))}
          className="sm:col-span-2"
        />
        <SwitchField
          label={copy.buttons.heroTwitch}
          checked={values.hero_twitch_button}
          onChange={(checked) => set('hero_twitch_button', checked)}
        />
        <SwitchField
          label={copy.buttons.heroCollaboration}
          checked={values.hero_collab_button}
          onChange={(checked) => set('hero_collab_button', checked)}
        />
      </SettingsCard>

      <SettingsCard title={copy.sections.hero}>
        <p className="text-sm text-muted sm:col-span-2">{copy.hero.hint}</p>
        <SwitchField
          label={copy.hero.offers}
          checked={values.hero_offers}
          onChange={(checked) => set('hero_offers', checked)}
        />
        <SwitchField
          label={copy.hero.nextEvent}
          checked={values.hero_next_event}
          onChange={(checked) => set('hero_next_event', checked)}
        />
      </SettingsCard>

      <SettingsCard title={copy.sections.twitch}>
        <SwitchField
          label={copy.twitch.embed}
          hint={copy.twitch.embedHint}
          checked={values.twitch_embed}
          onChange={(checked) => set('twitch_embed', checked)}
          className="sm:col-span-2"
        />
        {env.twitchStatusUrl === '' && (
          <p className="flex items-start gap-2 text-sm font-medium text-warning sm:col-span-2">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {copy.twitch.moduleMissing}
          </p>
        )}
      </SettingsCard>

      <SettingsCard title={copy.sections.socials}>
        {' '}
        {SOCIAL_PLATFORMS.map((platform) => (
          <TextField
            key={platform}
            label={t.socials[platform]}
            optional
            type="url"
            inputMode="url"
            placeholder={baseConfig.socials[platform] || 'https://…'}
            value={values.socials[platform]}
            error={errors[platform]}
            onChange={(event) => setSocial(platform, event.target.value)}
          />
        ))}
      </SettingsCard>

      <SettingsCard title={copy.sections.theme}>
        <p className="text-sm text-muted sm:col-span-2">{copy.theme.hint}</p>

        {PALETTE_KEYS.map((key) => (
          <ColorField
            key={key}
            label={copy.theme[key]}
            value={values.theme[key]}
            fallback={baseConfig.theme[key]}
            error={errors[key]}
            onChange={(value) => setColor(key, value)}
          />
        ))}

        <div className="rounded-2xl border border-line bg-bg p-4 sm:col-span-2">
          <p className="text-xs font-bold tracking-[0.16em] text-subtle uppercase">
            {copy.theme.preview}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={buttonClasses({ size: 'sm' })}>{copy.theme.previewButton}</span>
            <Badge tone="accent">
              <Star aria-hidden="true" className="size-3 fill-current" />
              {copy.theme.previewBadge}
            </Badge>
            <span className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-muted">
              <span className="font-semibold text-fg">Aa</span> {copy.theme.previewText}
            </span>
          </div>
        </div>

        {lowContrast && (
          <p
            role="status"
            className="flex items-start gap-2 text-sm font-medium text-warning sm:col-span-2"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {copy.theme.contrastWarning}
          </p>
        )}

        <div className="sm:col-span-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setValues((current) => ({ ...current, theme: toValues(null, baseConfig).theme }))
            }
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {copy.theme.reset}
          </Button>
        </div>
      </SettingsCard>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-3 rounded-card border border-line glass p-3">
        {saveError && <FormError className="min-w-0 flex-1 basis-64" message={saveError} />}
        <Button type="submit" loading={saving}>
          {saving ? t.common.saving : t.common.save}
        </Button>
      </div>
    </form>
  )
}

export function SettingsManager() {
  const { settings, isLoading } = useSiteConfig()

  return (
    <>
      <PageHeader title={copy.title} subtitle={copy.subtitle} />
      {isLoading ? (
        <LoadingBlock />
      ) : (
        // Keyed so the form re-initialises if the stored settings change underneath it.
        <SettingsForm key={settings?.updated_at ?? 'unset'} settings={settings} />
      )}
    </>
  )
}
