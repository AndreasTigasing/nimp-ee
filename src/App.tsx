import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LoadingBlock } from '@/components/ui/Spinner'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { SiteConfigProvider } from '@/providers/SiteConfigProvider'

// The admin panel is a separate chunk: visitors of the public site never download it.
const AdminApp = lazy(() => import('@/admin/AdminApp'))

// "/" on a custom domain, "/<repository>" on a GitHub project site.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export function App() {
  return (
    <ErrorBoundary>
      <SiteConfigProvider>
        <ToastProvider>
          <BrowserRouter basename={basename}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/admin/*"
                element={
                  <Suspense fallback={<LoadingBlock className="min-h-dvh" />}>
                    <AdminApp />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </SiteConfigProvider>
    </ErrorBoundary>
  )
}
