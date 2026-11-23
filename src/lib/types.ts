export type Role = 'owner' | 'admin' | 'user'

export interface Profile {
  id: string
  display_name: string | null
  role: Role
}

export interface Category {
  id: string
  slug: string
  name: Record<string, string>
}

export interface Book {
  id: string
  title: string
  author: string
  description: string | null
  cover_path: string | null
  file_path?: string | null
  file_type: 'pdf' | 'epub' | null
  category_id: string | null
  price_cents: number
  currency: string
}

export interface LibraryItem {
  book_id: string
  books: Book | null
}

export interface PurchaseStatusRow {
  book_id: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
}

export interface PendingPurchase {
  id: string
  amount_cents: number
  created_at: string
  books: { title: string; currency: string } | null
  profiles: { display_name: string | null } | null
}
