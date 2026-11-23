import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export type SupabaseProblem = 'missing' | 'invalid' | null

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

// Safety net: a secret / service_role key must never be bundled into frontend code.
function isSecretKey(v: string): boolean {
  if (v.startsWith('sb_secret_')) return true
  const parts = v.split('.')
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      return payload?.role === 'service_role'
    } catch {
      return false
    }
  }
  return false
}

function check(): SupabaseProblem {
  if (!url || !key) return 'missing'
  if (!isHttpUrl(url) || isSecretKey(key)) return 'invalid'
  return null
}

export const supabaseProblem: SupabaseProblem = check()
export const supabaseConfigured = supabaseProblem === null

// null when env vars are missing/invalid, so the app never crashes at startup.
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url as string, key as string)
  : null
