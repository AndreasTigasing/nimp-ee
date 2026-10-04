import { useEffect, useState } from 'react'
import { env } from '@/config/env'

/*
 * OPTIONAL MODULE — Twitch live status.
 *
 * Disabled unless VITE_TWITCH_STATUS_URL is set. The URL must point to an
 * endpoint that answers `{ "live": boolean, "title"?: string, "game"?: string }`
 * for `?channel=<login>`; supabase/functions/twitch-status is a ready-made
 * implementation that keeps the Twitch API credentials server-side.
 *
 * The site never depends on this: any failure simply reads as "unknown".
 */

export type TwitchLiveStatus = {
  /** null = unknown (module disabled, still loading, or the request failed). */
  isLive: boolean | null
  title: string | null
  game: string | null
}

const UNKNOWN: TwitchLiveStatus = { isLive: null, title: null, game: null }
const POLL_INTERVAL_MS = 2 * 60 * 1000

type StatusResponse = { live?: unknown; title?: unknown; game?: unknown }

async function fetchStatus(channel: string, signal: AbortSignal): Promise<TwitchLiveStatus> {
  const url = new URL(env.twitchStatusUrl)
  url.searchParams.set('channel', channel)

  const response = await fetch(url, { signal })
  if (!response.ok) return UNKNOWN

  const body = (await response.json()) as StatusResponse
  return {
    isLive: typeof body.live === 'boolean' ? body.live : null,
    title: typeof body.title === 'string' ? body.title : null,
    game: typeof body.game === 'string' ? body.game : null,
  }
}

export function useTwitchLive(channel: string): TwitchLiveStatus {
  const [status, setStatus] = useState<TwitchLiveStatus>(UNKNOWN)
  const enabled = env.twitchStatusUrl !== '' && channel !== ''

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()

    const refresh = () => {
      // Don't poll from background tabs.
      if (document.visibilityState !== 'visible') return
      fetchStatus(channel, controller.signal).then(setStatus, () => setStatus(UNKNOWN))
    }

    refresh()
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [channel, enabled])

  return enabled ? status : UNKNOWN
}
