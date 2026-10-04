import { paletteToCssVars } from '@/config/theme'
import type { ThemePalette } from '@/config/types'

/** Applies a palette to the live document (overrides the build-time values in index.html). */
export function applyPalette(palette: ThemePalette): void {
  const root = document.documentElement
  for (const [property, value] of Object.entries(paletteToCssVars(palette))) {
    root.style.setProperty(property, value)
  }
  document.head
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', palette.background)
}
