import { supabase } from './supabase'
import type { Book, Category, LibraryItem, PendingPurchase, PurchaseStatusRow } from './types'

function db() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export function errMsg(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message)
  }
  return String(e)
}

const BOOK_COLS = 'id, title, author, description, cover_path, file_type, category_id, price_cents, currency'

// PostgREST returns a to-one embed as an object, but normalise defensively.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await db()
    .from('books')
    .select(BOOK_COLS)
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as unknown as Book[]
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await db().from('categories').select('id, slug, name').order('slug')
  if (error) throw error
  return (data ?? []) as unknown as Category[]
}

export async function fetchLibraryIds(userId: string): Promise<string[]> {
  const { data, error } = await db().from('user_library').select('book_id').eq('user_id', userId)
  if (error) throw error
  return ((data ?? []) as unknown as { book_id: string }[]).map((r) => r.book_id)
}

export async function fetchMyPurchases(userId: string): Promise<PurchaseStatusRow[]> {
  const { data, error } = await db().from('purchases').select('book_id, status').eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as unknown as PurchaseStatusRow[]
}

export async function fetchLibrary(userId: string): Promise<LibraryItem[]> {
  const { data, error } = await db()
    .from('user_library')
    .select(`book_id, books(${BOOK_COLS}, file_path)`)
    .eq('user_id', userId)
    .order('added_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as unknown as { book_id: string; books: Book | Book[] | null }[]
  return rows.map((r) => ({ book_id: r.book_id, books: one(r.books) }))
}

/** Returns 'owned' (free book added to library) or 'pending' (awaiting approval). */
export async function requestBook(bookId: string): Promise<string> {
  const { data, error } = await db().rpc('request_book', { p_book_id: bookId })
  if (error) throw error
  return String(data)
}

export async function getBookUrl(path: string): Promise<string> {
  const { data, error } = await db().storage.from('books').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export function coverUrl(path: string | null): string | null {
  if (!supabase || !path) return null
  return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
}

export async function fetchPendingPurchases(): Promise<PendingPurchase[]> {
  const { data, error } = await db()
    .from('purchases')
    .select('id, amount_cents, created_at, books(title, currency), profiles!purchases_user_id_fkey(display_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  const rows = (data ?? []) as unknown as {
    id: string
    amount_cents: number
    created_at: string
    books: { title: string; currency: string } | { title: string; currency: string }[] | null
    profiles: { display_name: string | null } | { display_name: string | null }[] | null
  }[]
  return rows.map((r) => ({
    id: r.id,
    amount_cents: r.amount_cents,
    created_at: r.created_at,
    books: one(r.books),
    profiles: one(r.profiles)
  }))
}

export async function approvePurchase(id: string): Promise<void> {
  const { error } = await db().rpc('approve_purchase', { p_purchase_id: id })
  if (error) throw error
}

export async function rejectPurchase(id: string): Promise<void> {
  const { error } = await db().rpc('reject_purchase', { p_purchase_id: id })
  if (error) throw error
}
