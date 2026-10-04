import { isSectionVisible } from '@/config/sections'
import type { SectionSetting } from '@/config/types'
import { t } from '@/locales'

export type NavItem = { id: string; label: string }

/**
 * Anchor of the calendar block: the month grid when it is shown, otherwise the
 * stand-alone upcoming list, otherwise null (nothing to link to).
 */
export function calendarAnchor(sections: SectionSetting[]): string | null {
  if (isSectionVisible(sections, 'calendar')) return t.anchors.calendar
  if (isSectionVisible(sections, 'upcoming')) return t.anchors.upcoming
  return null
}

/**
 * Public navigation, following the admin-defined section order and skipping
 * hidden sections. Every item scrolls to a section of the home page.
 */
export function buildNavItems(sections: SectionSetting[]): NavItem[] {
  const items: NavItem[] = [{ id: t.anchors.home, label: t.nav.home }]
  const calendar = calendarAnchor(sections)

  for (const section of sections) {
    if (!section.visible) continue
    if (section.id === 'offers') {
      items.push({ id: t.anchors.offers, label: t.nav.offers })
    } else if ((section.id === 'calendar' || section.id === 'upcoming') && calendar) {
      if (!items.some((item) => item.id === calendar)) {
        items.push({ id: calendar, label: t.nav.calendar })
      }
    } else if (section.id === 'collaboration') {
      items.push({ id: t.anchors.collaboration, label: t.nav.collaboration })
    }
  }

  return items
}

/**
 * Link to a home-page section that works from any route and under any base
 * path (custom domain or https://user.github.io/<repository>/).
 */
export function sectionHref(id: string): string {
  return `${import.meta.env.BASE_URL}#${id}`
}
