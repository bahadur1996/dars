import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { refreshAccessToken, setSessionExpiredHandler, tokens } from '../api/client'
import { authApi } from '../api/endpoints'
import type { User } from '../api/types'

interface AuthState {
  user: User | null
  /** True until the stored refresh token has been tried on startup. */
  restoring: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    setSessionExpiredHandler(() => {
      tokens.clear()
      setUser(null)
    })
    let cancelled = false
    refreshAccessToken()
      .then((token) => (token ? authApi.me() : null))
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => tokens.clear())
      .finally(() => {
        if (!cancelled) setRestoring(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    tokens.set(res)
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    const refresh = tokens.refresh
    if (refresh) await authApi.logout(refresh).catch(() => undefined)
    tokens.clear()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, restoring, login, logout }), [user, restoring, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
