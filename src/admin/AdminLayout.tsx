import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router'
import { buttonClasses } from '@/components/ui/button-styles'
import { t } from '@/locales'
import { AdminSidebar } from './AdminSidebar'

const DRAWER_ID = 'admin-drawer'

/** Admin shell: fixed sidebar on large screens, slide-over drawer below that. */
export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface lg:block">
        <AdminSidebar />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line glass px-4 lg:hidden">
        <button
          type="button"
          aria-expanded={drawerOpen}
          aria-controls={DRAWER_ID}
          aria-label={t.admin.nav.openMenu}
          onClick={() => setDrawerOpen(true)}
          className={buttonClasses({ variant: 'secondary', size: 'icon' })}
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <p className="font-display text-sm font-bold">{t.admin.title}</p>
      </header>

      {drawerOpen && (
        <div id={DRAWER_ID} className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={t.common.close}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 size-full animate-fade cursor-default bg-black/70"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade overflow-y-auto border-r border-line bg-surface">
            <button
              type="button"
              aria-label={t.common.close}
              onClick={() => setDrawerOpen(false)}
              className={buttonClasses({
                variant: 'ghost',
                size: 'icon',
                className: 'absolute top-3 right-3',
              })}
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            <AdminSidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
