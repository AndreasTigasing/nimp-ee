import { createContext, useContext } from 'react'
import { streamerConfig } from '@/config/streamer'
import type { StreamerConfig } from '@/config/types'
import type { SiteSettings } from '@/types/database'

export type SiteConfigValue = {
  /** Effective configuration: defaults ← env ← database settings. */
  config: StreamerConfig
  /** Build-time configuration only (defaults ← env): what an empty setting falls back to. */
  baseConfig: StreamerConfig
  /** Raw database row, or null when unavailable. */
  settings: SiteSettings | null
  isLoading: boolean
  /** Lets the admin panel push freshly saved settings without a refetch. */
  setSettings: (settings: SiteSettings) => void
}

export const SiteConfigContext = createContext<SiteConfigValue>({
  config: streamerConfig,
  baseConfig: streamerConfig,
  settings: null,
  isLoading: false,
  setSettings: () => {},
})

export function useSiteConfig(): SiteConfigValue {
  return useContext(SiteConfigContext)
}
