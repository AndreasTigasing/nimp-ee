import type { ReactNode } from 'react'
import { t } from '@/locales'
import { Footer } from './Footer'
import { Header } from './Header'

const MAIN_ID = 'sisu'

/** Shell of every public page: skip link, sticky header, main content, footer. */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href={`#${MAIN_ID}`}
        className="sr-only rounded-control bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        {t.nav.skipToContent}
      </a>
      <Header />
      <main id={MAIN_ID} tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </>
  )
}
