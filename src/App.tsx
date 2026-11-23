import { useEffect, useState, type ReactNode } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { BookOpen, LogIn, LogOut, Moon, Shield, Sun } from 'lucide-react'
import { LANGS, useI18n, type Lang } from './i18n'
import { supabaseConfigured, supabaseProblem } from './lib/supabase'
import { useAuth } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import Home from './pages/Home'
import Store from './pages/Store'
import Library from './pages/Library'
import Login from './pages/Login'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'

function Shell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n()
  const { user, isStaff, signOut } = useAuth()
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('theme') !== 'light' } catch { return true }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch { /* storage unavailable */ }
  }, [dark])
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-bg/80 px-4 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 font-bold tracking-widest text-accent">
          <BookOpen size={22} /> AYANO KOJI
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link to="/">{t('home')}</Link>
          <Link to="/store">{t('store')}</Link>
          {user && <Link to="/library">{t('library')}</Link>}
          {isStaff && <Link to="/admin" className="flex items-center gap-1"><Shield size={14} />{t('admin')}</Link>}
          {supabaseConfigured && (user ? (
            <button className="flex items-center gap-1" onClick={() => { void signOut() }}><LogOut size={14} />{t('logout')}</button>
          ) : (
            <Link to="/login" className="flex items-center gap-1"><LogIn size={14} />{t('login')}</Link>
          ))}
          <select aria-label={t('language')} value={lang} onChange={(e) => setLang(e.target.value as Lang)}
            className="rounded-lg bg-card px-2 py-1">
            {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button aria-label={t('theme')} onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </nav>
      </header>
      {!supabaseConfigured && (
        <div role="alert" className="mx-auto mt-3 max-w-6xl rounded-xl bg-card p-3 text-center text-sm text-accent">
          {t(supabaseProblem === 'invalid' ? 'supabaseInvalid' : 'supabaseMissing')}
        </div>
      )}
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/store" element={<Store />} />
        <Route path="/login" element={<Login />} />
        <Route path="/library" element={<RequireAuth><Library /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth staff><Admin /></RequireAuth>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  )
}
