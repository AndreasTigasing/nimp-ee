import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { errorMessage } from '@/lib/errors'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { updateSiteSettings } from '@/services/settings'
import { FormError } from '../components/FormError'
import { SegmentedControl } from '../components/SegmentedControl'

const copy = t.admin.setup.domain

type Hosting = 'github' | 'server'

/** DNS records GitHub Pages needs for an apex domain plus `www`. */
const GITHUB_DNS = [
  { type: 'A', name: '@', value: '185.199.108.153' },
  { type: 'A', name: '@', value: '185.199.109.153' },
  { type: 'A', name: '@', value: '185.199.110.153' },
  { type: 'A', name: '@', value: '185.199.111.153' },
  { type: 'CNAME', name: 'www', value: '<kasutaja>.github.io' },
]

const DOMAIN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

/** "https://www.Nimp.ee/" → "www.nimp.ee"; returns '' when it is not a domain. */
function parseDomain(input: string): string {
  const host = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  return DOMAIN.test(host) ? host : ''
}

/**
 * Step 3: record the public address and show what has to be done at the DNS /
 * hosting side. Pointing a domain is outside what a website can do itself.
 */
export function DomainStep({ onDone }: { onDone: () => void }) {
  const { settings, setSettings } = useSiteConfig()
  const [input, setInput] = useState(() => settings?.site_url?.replace(/^https?:\/\//, '') ?? '')
  const [hosting, setHosting] = useState<Hosting>(() =>
    window.location.hostname.endsWith('.github.io') ? 'github' : 'server',
  )
  const [invalid, setInvalid] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const domain = parseDomain(input)
  const steps = hosting === 'github' ? copy.githubSteps(domain) : copy.serverSteps(domain)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (input.trim() === '') {
      onDone()
      return
    }
    if (!domain) {
      setInvalid(true)
      return
    }

    setBusy(true)
    try {
      setSettings(await updateSiteSettings({ site_url: `https://${domain}` }))
      onDone()
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {copy.hint} {copy.current(window.location.origin)}
      </p>

      <TextField
        label={copy.domain}
        optional
        placeholder={copy.domainPlaceholder}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={input}
        error={invalid ? copy.invalid : undefined}
        onChange={(event) => {
          setInput(event.target.value)
          setInvalid(false)
        }}
      />

      {domain && (
        <div className="rounded-2xl border border-line bg-bg/55 p-4">
          <p className="text-sm font-semibold">{copy.hosting}</p>
          <SegmentedControl
            label={copy.hosting}
            value={hosting}
            onChange={setHosting}
            options={[
              { value: 'server', label: copy.hostingServer },
              { value: 'github', label: copy.hostingGithub },
            ]}
            className="mt-2"
          />

          <p className="mt-4 text-xs font-bold tracking-[0.16em] text-subtle uppercase">
            {copy.stepsTitle}
          </p>
          <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-muted">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {hosting === 'github' && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-subtle">
                  <tr>
                    <th className="py-1 pr-4 font-semibold">{copy.dnsType}</th>
                    <th className="py-1 pr-4 font-semibold">{copy.dnsName}</th>
                    <th className="py-1 font-semibold">{copy.dnsValue}</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {GITHUB_DNS.map((record) => (
                    <tr key={`${record.type}-${record.value}`} className="border-t border-line">
                      <td className="py-1.5 pr-4">{record.type}</td>
                      <td className="py-1.5 pr-4">{record.name}</td>
                      <td className="py-1.5">{record.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {error && <FormError message={error} />}

      <div className="mt-2 flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onDone} disabled={busy}>
          {copy.skip}
        </Button>
        <Button type="submit" loading={busy}>
          {copy.finish}
        </Button>
      </div>
    </form>
  )
}
