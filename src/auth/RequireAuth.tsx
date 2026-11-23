import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { supabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

export default function RequireAuth({ children, staff = false }: { children: ReactNode; staff?: boolean }) {
  const { user, loading, isStaff } = useAuth()
  const { t } = useI18n()
  const loc = useLocation()

  if (!supabaseConfigured) return <div className="card p-8 text-center text-muted">{t('supabaseMissing')}</div>
  if (loading) return <div className="p-8 text-center text-muted">{t('loading')}</div>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (staff && !isStaff) return <Navigate to="/" replace />
  return <>{children}</>
}
