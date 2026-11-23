import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="card space-y-3 p-8 text-center">
      <p className="text-muted">{t('notFound')}</p>
      <Link to="/" className="btn">{t('backHome')}</Link>
    </div>
  )
}
