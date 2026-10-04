import { useEffect } from 'react'

type PageMeta = {
  title: string
  description?: string
  /** Adds `<meta name="robots" content="noindex">` while the page is mounted. */
  noIndex?: boolean
  /**
   * Canonical URL to add when the build did not bake one in (a pre-built
   * package only learns its address from the admin settings).
   */
  canonical?: string
}

function upsertMeta(name: string, content: string): HTMLMetaElement {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.append(element)
  }
  element.content = content
  return element
}

/**
 * Keeps the document head in sync at runtime. The static tags baked into
 * index.html at build time remain the source for crawlers and link previews;
 * this covers values that changed since (admin settings) and per-route titles.
 */
export function usePageMeta({ title, description, noIndex = false, canonical }: PageMeta): void {
  useEffect(() => {
    document.title = title
  }, [title])

  useEffect(() => {
    if (description) upsertMeta('description', description)
  }, [description])

  useEffect(() => {
    if (!noIndex) return
    const element = upsertMeta('robots', 'noindex, nofollow')
    return () => element.remove()
  }, [noIndex])

  useEffect(() => {
    // A canonical link from the build always wins.
    if (!canonical || document.head.querySelector('link[rel="canonical"]')) return
    const element = document.createElement('link')
    element.rel = 'canonical'
    element.href = canonical
    document.head.append(element)
    return () => element.remove()
  }, [canonical])
}
