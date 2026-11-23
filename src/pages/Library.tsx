import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import BookCard from '../components/BookCard'
import { useI18n } from '../i18n'
import { errMsg, fetchLibrary, getBookUrl } from '../lib/api'
import type { LibraryItem } from '../lib/types'

export default function Library() {
  const { t } = useI18n()
  const { user } = useAuth()
  const uid = user?.id
  const [items, setItems] = useState<LibraryItem[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    fetchLibrary(uid)
      .then((rows) => {
        if (!cancelled) {
          setItems(rows)
          setState('ready')
        }
      })
      .catch((e) => {
        console.error(errMsg(e))
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  async function open(path: string) {
    setNotice('')
    try {
      const url = await getBookUrl(path)
      const w = window.open(url, '_blank', 'noopener')
      if (!w) window.location.assign(url)
    } catch (e) {
      console.error(errMsg(e))
      setNotice(t('loadError'))
    }
  }

  if (state === 'loading') return <div className="p-8 text-center text-muted">{t('loading')}</div>
  if (state === 'error') return <div className="card p-8 text-center text-muted">{t('loadError')}</div>

  const books = items.flatMap((i) => (i.books ? [i.books] : []))
  if (books.length === 0) return <div className="card p-8 text-center text-muted">{t('emptyLibrary')}</div>
  return (
    <section className="space-y-4">
      {notice && <div role="status" className="rounded-xl bg-card p-3 text-center text-sm text-accent">{notice}</div>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((b) => (
          <BookCard
            key={b.id}
            book={b}
            showPrice={false}
            action={b.file_path ? <button className="btn text-sm" onClick={() => open(b.file_path as string)}>{t('open')}</button> : undefined}
          />
        ))}
      </div>
    </section>
  )
}
