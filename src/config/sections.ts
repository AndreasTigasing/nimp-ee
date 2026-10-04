import { SECTION_IDS, type SectionId, type SectionSetting } from './types'

function isSectionId(value: unknown): value is SectionId {
  return typeof value === 'string' && (SECTION_IDS as readonly string[]).includes(value)
}

/**
 * Builds a complete, duplicate-free section list: ids from `order` first (in
 * that order), then any remaining ids in their `base` order. Visibility comes
 * from `hidden` when given, otherwise from `base`.
 */
export function resolveSections(
  base: SectionSetting[],
  order: readonly unknown[] | null | undefined,
  hidden: readonly unknown[] | null | undefined,
): SectionSetting[] {
  const baseVisible = new Map(base.map((section) => [section.id, section.visible]))
  const hiddenIds = hidden ? new Set(hidden.filter(isSectionId)) : null

  const ids: SectionId[] = []
  for (const id of [...(order ?? []), ...base.map((section) => section.id), ...SECTION_IDS]) {
    if (isSectionId(id) && !ids.includes(id)) ids.push(id)
  }

  return ids.map((id) => ({
    id,
    visible: hiddenIds ? !hiddenIds.has(id) : (baseVisible.get(id) ?? true),
  }))
}

export function isSectionVisible(sections: SectionSetting[], id: SectionId): boolean {
  return sections.some((section) => section.id === id && section.visible)
}

/**
 * The calendar grid and the upcoming list share one section (side by side)
 * when both are visible and "upcoming" comes right after "calendar".
 */
export function calendarHasUpcoming(sections: SectionSetting[]): boolean {
  const visible = sections.filter((section) => section.visible).map((section) => section.id)
  const index = visible.indexOf('calendar')
  return index !== -1 && visible[index + 1] === 'upcoming'
}
