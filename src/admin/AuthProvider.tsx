import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { checkIsAdmin, getSession, onSessionChange, type Session } from '@/services/auth'
import { AuthContext, type AuthStatus, type AuthValue } from './auth-context'

type AdminCheck = {
  /** The verification this result belongs to (user + attempt). */
  key: string
  result: 'admin' | 'not-admin' | 'error'
}

/**
 * Tracks the Supabase Auth session and whether that user is an admin.
 *
 * This only drives what the UI shows. It is not the security boundary: every
 * admin query is authorised again by Row Level Security in the database.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // undefined = still restoring the persisted session
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [check, setCheck] = useState<AdminCheck | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}

    getSession().then(
      (current) => {
        if (active) setSession(current)
      },
      () => {
        if (active) setSession(null)
      },
    )

    onSessionChange((next) => {
      if (active) setSession(next)
    }).then(
      (off) => {
        if (active) unsubscribe = off
        else off()
      },
      () => {},
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null
  const checkKey = userId ? `${userId}#${attempt}` : null

  useEffect(() => {
    if (!checkKey) return
    let active = true

    checkIsAdmin().then(
      (isAdmin) => {
        if (active) setCheck({ key: checkKey, result: isAdmin ? 'admin' : 'not-admin' })
      },
      () => {
        if (active) setCheck({ key: checkKey, result: 'error' })
      },
    )

    return () => {
      active = false
    }
  }, [checkKey])

  const value = useMemo<AuthValue>(() => {
    let status: AuthStatus
    if (session === undefined) status = 'loading'
    else if (session === null) status = 'signed-out'
    else if (check?.key !== checkKey) status = 'loading'
    else status = check.result

    return {
      status,
      email: session?.user.email ?? null,
      retry: () => setAttempt((count) => count + 1),
    }
  }, [session, check, checkKey])

  return <AuthContext value={value}>{children}</AuthContext>
}
