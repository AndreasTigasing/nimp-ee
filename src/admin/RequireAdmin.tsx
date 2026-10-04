import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingBlock } from '@/components/ui/Spinner'
import { t } from '@/locales'
import { useAuth } from './auth-context'

/** Route guard: renders the nested admin routes only for verified admins. */
export function RequireAdmin() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center">
        <LoadingBlock />
        <span className="sr-only">{t.admin.login.checking}</span>
      </div>
    )
  }

  if (status !== 'admin') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
