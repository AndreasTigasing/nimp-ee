import { useEffect, useState } from 'react'

/**
 * Returns the id of the section currently crossing the middle of the viewport
 * (used to highlight the matching navigation link). `ids` must be a stable
 * array reference.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      // A thin band around the vertical centre of the viewport.
      { rootMargin: '-45% 0px -50% 0px' },
    )

    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [ids])

  return activeId
}
