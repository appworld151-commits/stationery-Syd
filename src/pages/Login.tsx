import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n'
import { errMsg } from '../lib/api'
import { supabase, supabaseConfigured } from '../lib/supabase'

export default function Login() {
  const { t } = useI18n()
  const { user } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const from = (loc.state as { from?: string } | null)?.from ?? '/library'

  useEffect(() => {
    if (user) nav(from, { replace: true })
  }, [user, from, nav])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const client = supabase
    if (!client) return
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      if (mode === 'in') {
        const { error } = await client.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}` }
        })
        if (error) throw error
        if (!data.session) setMsg(t('checkEmail'))
      }
    } catch (ex) {
      setErr(errMsg(ex))
    } finally {
      setBusy(false)
    }
  }

  if (!supabaseConfigured) return <div className="card p-8 text-center text-muted">{t('supabaseMissing')}</div>

  const field = 'w-full rounded-lg bg-card px-3 py-2'
  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-3 p-6">
      <h2 className="text-lg font-bold">{mode === 'in' ? t('login') : t('signup')}</h2>
      {mode === 'up' && (
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} aria-label={t('name')} maxLength={80} />
      )}
      <input className={field} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('email')} aria-label={t('email')} />
      <input className={field} type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('password')} aria-label={t('password')} />
      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
      {msg && <p role="status" className="text-sm text-accent">{msg}</p>}
      <button className="btn w-full justify-center" type="submit" disabled={busy}>{mode === 'in' ? t('login') : t('signup')}</button>
      <button type="button" className="w-full text-sm text-muted underline" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); setMsg('') }}>
        {mode === 'in' ? t('noAccount') : t('haveAccount')}
      </button>
    </form>
  )
}
