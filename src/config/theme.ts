import type { ThemePalette } from './types.ts'

/*
 * Pure colour helpers shared by the browser and the Vite build plugin.
 * Keep this file free of DOM and `import.meta.env` access.
 */

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

const DARK_INK = '#0b0a10'
const LIGHT_INK = '#ffffff'

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value.trim())
}

/** Normalises `#abc` / `#AABBCC` to lowercase 6-digit hex. Returns null when invalid. */
export function normalizeHex(value: unknown): string | null {
  if (!isHexColor(value)) return null
  const hex = value.trim().toLowerCase()
  if (hex.length === 7) return hex
  const [r, g, b] = hex.slice(1)
  return `#${r}${r}${g}${g}${b}${b}`
}

function channelToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance, 0 (black) – 1 (white). */
export function relativeLuminance(hex: string): number {
  const normalized = normalizeHex(hex) ?? '#000000'
  const r = Number.parseInt(normalized.slice(1, 3), 16)
  const g = Number.parseInt(normalized.slice(3, 5), 16)
  const b = Number.parseInt(normalized.slice(5, 7), 16)
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Picks dark or light text, whichever is more readable on the given fill colour. */
export function readableInk(fill: string): string {
  return contrastRatio(fill, DARK_INK) >= contrastRatio(fill, LIGHT_INK) ? DARK_INK : LIGHT_INK
}

export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.4
}

/** Merges palette overrides, ignoring anything that is not a valid hex colour. */
export function mergePalette(
  base: ThemePalette,
  overrides: Partial<Record<keyof ThemePalette, string | null | undefined>>,
): ThemePalette {
  const next = { ...base }
  for (const key of Object.keys(base) as (keyof ThemePalette)[]) {
    const hex = normalizeHex(overrides[key])
    if (hex) next[key] = hex
  }
  return next
}

/** CSS custom properties consumed by `src/index.css`. */
export function paletteToCssVars(palette: ThemePalette): Record<string, string> {
  return {
    '--palette-primary': palette.primary,
    '--palette-primary-ink': readableInk(palette.primary),
    '--palette-accent': palette.accent,
    '--palette-accent-ink': readableInk(palette.accent),
    '--palette-bg': palette.background,
    '--palette-surface': palette.surface,
    '--palette-text': palette.text,
    'color-scheme': isDarkColor(palette.background) ? 'dark' : 'light',
  }
}

/** Serialises the palette as a `:root { … }` rule (inlined into index.html at build time). */
export function paletteToCss(palette: ThemePalette): string {
  const declarations = Object.entries(paletteToCssVars(palette))
    .map(([property, value]) => `${property}:${value}`)
    .join(';')
  return `:root{${declarations}}`
}
