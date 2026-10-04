import { Navigate, Route, Routes } from 'react-router'
import { usePageMeta } from '@/hooks/usePageMeta'
import { t } from '@/locales'
import { useSiteConfig } from '@/providers/site-config-context'
import { AdminLayout } from './AdminLayout'
import { AuthProvider } from './AuthProvider'
import { CalendarManager } from './CalendarManager'
import { ContactSubmissions } from './ContactSubmissions'
import { Dashboard } from './Dashboard'
import { LoginPage } from './LoginPage'
import { OffersManager } from './OffersManager'
import { RequireAdmin } from './RequireAdmin'
import { SettingsManager } from './SettingsManager'
import { SetupPage } from './setup/SetupPage'

/**
 * Everything under /admin. Loaded lazily (see App.tsx), so this code and the
 * full Supabase SDK it needs are never downloaded by public-site visitors.
 */
export default function AdminApp() {
  const { config } = useSiteConfig()
  usePageMeta({ title: `${t.admin.title} – ${config.name}`, noIndex: true })

  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="setup" element={<SetupPage />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="offers" element={<OffersManager />} />
            <Route path="calendar" element={<CalendarManager />} />
            <Route path="submissions" element={<ContactSubmissions />} />
            <Route path="settings" element={<SettingsManager />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  )
}
