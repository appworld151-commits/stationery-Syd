import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { errMsg, fetchBooks } from '../lib/api'
import { supabaseConfigured } from '../lib/supabase'
import type { Book } from '../lib/types'
import BookCard from '../components/BookCard'

export default function Home() {
  const { t } = useI18n()
  const [books, setBooks] = useState<Book[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(supabaseConfigured ? 'loading' : 'ready')

  useEffect(() => {
    if (!supabaseConfigured) return
    let cancelled = false
    fetchBooks()
      .then((b) => {
        if (!cancelled) {
          setBooks(b.slice(0, 8))
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
  }, [])

  if (state === 'loading') return <div className="p-8 text-center text-muted">{t('loading')}</div>
  if (state === 'error') return <div className="card p-8 text-center text-muted">{t('loadError')}</div>
  if (books.length === 0) return <div className="card p-8 text-center text-muted">{t('noBooks')}</div>
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{t('welcome')}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((b) => <BookCard key={b.id} book={b} />)}
      </div>
    </section>
  )
}
