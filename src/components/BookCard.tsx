import type { ReactNode } from 'react'
import { BookOpen } from 'lucide-react'
import { useI18n } from '../i18n'
import { coverUrl } from '../lib/api'
import { formatPrice } from '../lib/format'
import type { Book } from '../lib/types'

export default function BookCard({ book, action, showPrice = true }: { book: Book; action?: ReactNode; showPrice?: boolean }) {
  const { t, lang } = useI18n()
  const cover = coverUrl(book.cover_path)
  return (
    <article className="card flex flex-col overflow-hidden">
      {cover ? (
        <img src={cover} alt={book.title} loading="lazy" className="aspect-[3/4] w-full object-cover" />
      ) : (
        <div className="flex aspect-[3/4] w-full items-center justify-center bg-bg text-muted">
          <BookOpen size={40} />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="font-semibold leading-snug">{book.title}</h3>
        <p className="text-sm text-muted">{book.author}</p>
        {showPrice && (
          <p className="text-sm font-medium text-accent">
            {formatPrice(book.price_cents, book.currency, lang, t('free'))}
          </p>
        )}
        {action && <div className="mt-auto pt-2">{action}</div>}
      </div>
    </article>
  )
}
