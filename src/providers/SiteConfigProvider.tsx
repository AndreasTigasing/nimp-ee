import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { applySiteSettings } from '@/config/merge'
import { streamerConfig } from '@/config/streamer'
import { useAsync } from '@/hooks/useAsync'
import { applyPalette } from '@/lib/apply-theme'
import { getSiteSettings } from '@/services/settings'
import type { SiteSettings } from '@/types/database'
import { SiteConfigContext, type SiteConfigValue } from './site-config-context'

// Last known settings, so returning visitors get the right name and colours
// on first paint instead of after the network round-trip.
const CACHE_KEY = 'streamer-site:settings'

function readCache(): SiteSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as SiteSettings) : null
  } catch {
    return null
  }
}

function writeCache(settings: SiteSettings | null): void {
  try {
    if (settings) localStorage.setItem(CACHE_KEY, JSON.stringify(settings))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    // Storage unavailable (private mode, quota): the cache is only an optimisation.
  }
}

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [cached] = useState(readCache)
  const [saved, setSaved] = useState<SiteSettings | null>(null)
  const { data: fetched, isLoading } = useAsync('site-settings', getSiteSettings)

  // Freshly saved (admin) → fetched → cached. If the database is unreachable
  // the cached / build-time configuration keeps the site fully usable.
  const settings = saved ?? (fetched !== undefined ? fetched : cached)
  const config = useMemo(() => applySiteSettings(streamerConfig, settings), [settings])

  useEffect(() => {
    applyPalette(config.theme)
  }, [config.theme])

  useEffect(() => {
    if (fetched !== undefined) writeCache(fetched)
  }, [fetched])

  const value = useMemo<SiteConfigValue>(
    () => ({
      config,
      baseConfig: streamerConfig,
      settings,
      isLoading,
      setSettings: (next) => {
        setSaved(next)
        writeCache(next)
      },
    }),
    [config, settings, isLoading],
  )

  return <SiteConfigContext value={value}>{children}</SiteConfigContext>
}
