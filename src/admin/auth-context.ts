import { createContext, useContext } from 'react'

export type AuthStatus =
  /** Restoring the session or verifying admin rights. */
  | 'loading'
  | 'signed-out'
  /** Signed in with a valid account that is not listed in admin_users. */
  | 'not-admin'
  /** Could not verify (network / configuration problem). */
  | 'error'
  | 'admin'

export type AuthValue = {
  status: AuthStatus
  email: string | null
  /** Re-runs the admin verification after an error. */
  retry: () => void
}

export const AuthContext = createContext<AuthValue>({
  status: 'loading',
  email: null,
  retry: () => {},
})

export function useAuth(): AuthValue {
  return useContext(AuthContext)
}
