import {
  siDiscord,
  siFacebook,
  siInstagram,
  siSteam,
  siTiktok,
  siTwitch,
  siX,
  siYoutube,
} from 'simple-icons'
import type { SocialPlatform } from '@/config/types'

// Lucide ships no brand logos, so these come from Simple Icons (tree-shaken:
// only the paths below end up in the bundle).
const PATHS: Record<SocialPlatform, string> = {
  twitch: siTwitch.path,
  instagram: siInstagram.path,
  youtube: siYoutube.path,
  tiktok: siTiktok.path,
  discord: siDiscord.path,
  facebook: siFacebook.path,
  x: siX.path,
  steam: siSteam.path,
}

type SocialIconProps = {
  platform: SocialPlatform
  className?: string
}

/** Decorative brand glyph — always pair it with visible or screen-reader text. */
export function SocialIcon({ platform, className }: SocialIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={PATHS[platform]} />
    </svg>
  )
}
