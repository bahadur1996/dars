import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, refreshAccessToken, session } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  restoring: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    session.onExpired(() => {
      void session.clear()
      setUser(null)
    })
    refreshAccessToken()
      .then((token) => (token ? authApi.me() : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setRestoring(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    await session.store(res)
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    const refresh = await session.refreshToken()
    if (refresh) await authApi.logout(refresh).catch(() => undefined)
    await session.clear()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, restoring, login, logout }), [user, restoring, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
