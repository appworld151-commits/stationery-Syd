import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import BookCard from '../components/BookCard'
import { useI18n } from '../i18n'
import { errMsg, fetchBooks, fetchCategories, fetchLibraryIds, fetchMyPurchases, requestBook } from '../lib/api'
import { formatPrice } from '../lib/format'
import { supabaseConfigured } from '../lib/supabase'
import type { Book, Category } from '../lib/types'

export default function Store() {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const uid = user?.id
  const [books, setBooks] = useState<Book[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [owned, setOwned] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(supabaseConfigured ? 'loading' : 'ready')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!supabaseConfigured) return
    let cancelled = false
    ;(async () => {
      try {
        const [b, c] = await Promise.all([fetchBooks(), fetchCategories()])
        let lib: string[] = []
        let pend: string[] = []
        if (uid) {
          const [l, p] = await Promise.all([fetchLibraryIds(uid), fetchMyPurchases(uid)])
          lib = l
          pend = p.filter((x) => x.status === 'pending').map((x) => x.book_id)
        }
        if (cancelled) return
        setBooks(b)
        setCats(c)
        setOwned(new Set(lib))
        setPending(new Set(pend))
        setState('ready')
      } catch (e) {
        console.error(errMsg(e))
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return books.filter(
      (b) =>
        (!cat || b.category_id === cat) &&
        (!needle || b.title.toLowerCase().includes(needle) || b.author.toLowerCase().includes(needle))
    )
  }, [books, q, cat])

  async function get(id: string) {
    setBusy(id)
    setNotice('')
    try {
      const status = await requestBook(id)
      if (status === 'owned') {
        setOwned((prev) => new Set(prev).add(id))
        setNotice(t('added'))
      } else {
        setPending((prev) => new Set(prev).add(id))
        setNotice(t('requested'))
      }
    } catch (e) {
      console.error(errMsg(e))
      setNotice(t('loadError'))
    } finally {
      setBusy(null)
    }
  }

  function actionFor(b: Book) {
    if (!user) return <Link to="/login" state={{ from: '/store' }} className="text-sm text-accent underline">{t('signInToGet')}</Link>
    if (owned.has(b.id)) return <Link to="/library" className="text-sm text-accent underline">{t('owned')}</Link>
    if (pending.has(b.id)) return <span className="text-sm text-muted">{t('pending')}</span>
    const label = b.price_cents === 0 ? t('getFree') : `${t('request')} · ${formatPrice(b.price_cents, b.currency, lang, t('free'))}`
    return <button className="btn text-sm" disabled={busy === b.id} onClick={() => get(b.id)}>{label}</button>
  }

  if (!supabaseConfigured) return <div className="card p-8 text-center text-muted">{t('supabaseMissing')}</div>
  if (state === 'loading') return <div className="p-8 text-center text-muted">{t('loading')}</div>
  if (state === 'error') return <div className="card p-8 text-center text-muted">{t('loadError')}</div>

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')}
          className="min-w-0 flex-1 rounded-lg bg-card px-3 py-2"
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('allCategories')} className="rounded-lg bg-card px-3 py-2">
          <option value="">{t('allCategories')}</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name[lang] ?? c.name.en ?? c.slug}</option>)}
        </select>
      </div>
      {notice && <div role="status" className="rounded-xl bg-card p-3 text-center text-sm text-accent">{notice}</div>}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-muted">{books.length === 0 ? t('noBooks') : t('noResults')}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((b) => <BookCard key={b.id} book={b} action={actionFor(b)} />)}
        </div>
      )}
    </section>
  )
}
