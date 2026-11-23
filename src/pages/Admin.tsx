import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { approvePurchase, errMsg, fetchPendingPurchases, rejectPurchase } from '../lib/api'
import { formatPrice } from '../lib/format'
import type { PendingPurchase } from '../lib/types'

export default function Admin() {
  const { t, lang } = useI18n()
  const [rows, setRows] = useState<PendingPurchase[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPendingPurchases()
      .then((r) => {
        if (!cancelled) {
          setRows(r)
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

  async function act(id: string, fn: (id: string) => Promise<void>) {
    setBusy(id)
    setNotice('')
    try {
      await fn(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      setNotice(errMsg(e))
    } finally {
      setBusy(null)
    }
  }

  if (state === 'loading') return <div className="p-8 text-center text-muted">{t('loading')}</div>
  if (state === 'error') return <div className="card p-8 text-center text-muted">{t('loadError')}</div>
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">{t('pendingPayments')}</h2>
      {notice && <div role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-red-500">{notice}</div>}
      {rows.length === 0 ? (
        <div className="card p-8 text-center text-muted">{t('nothingPending')}</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{r.books?.title ?? '—'}</p>
                <p className="text-sm text-muted">
                  {r.profiles?.display_name ?? '—'} · {formatPrice(r.amount_cents, r.books?.currency ?? 'USD', lang, t('free'))} · {new Date(r.created_at).toLocaleDateString(lang)}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn text-sm" disabled={busy === r.id} onClick={() => act(r.id, approvePurchase)}>{t('approve')}</button>
                <button className="rounded-xl bg-bg px-4 py-2 text-sm" disabled={busy === r.id} onClick={() => act(r.id, rejectPurchase)}>{t('reject')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
