import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

type AuthCtx = {
  user: User | null
  profile: Profile | null
  loading: boolean
  isStaff: boolean
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null,
  profile: null,
  loading: false,
  isStaff: false,
  signOut: async () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionReady, setSessionReady] = useState(!supabase)
  const [loaded, setLoaded] = useState<{ uid: string; profile: Profile | null } | null>(null)

  useEffect(() => {
    const client = supabase
    if (!client) return
    let active = true
    client.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setSession(data.session)
          setSessionReady(true)
        }
      })
      .catch(() => {
        if (active) setSessionReady(true)
      })
    const { data } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setSessionReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const user = session?.user ?? null
  const uid = user?.id

  // Profile (role) is loaded outside onAuthStateChange to avoid auth-lock deadlocks.
  useEffect(() => {
    const client = supabase
    if (!client || !uid) return
    let active = true
    ;(async () => {
      let profile: Profile | null = null
      try {
        const { data } = await client.from('profiles').select('id, display_name, role').eq('id', uid).maybeSingle()
        profile = (data as Profile | null) ?? null
      } catch {
        profile = null
      }
      if (active) setLoaded({ uid, profile })
    })()
    return () => {
      active = false
    }
  }, [uid])

  const profile = loaded && loaded.uid === uid ? loaded.profile : null
  const loading = !sessionReady || (!!uid && loaded?.uid !== uid)
  const isStaff = profile?.role === 'owner' || profile?.role === 'admin'

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  return <Ctx.Provider value={{ user, profile, loading, isStaff, signOut }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
