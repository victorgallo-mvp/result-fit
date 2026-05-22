import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '@/api/auth'
import { toast } from 'sonner'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password)
    localStorage.setItem('token', data.access_token)
    // strip password_hash from stored user
    const { password_hash, ...safeUser } = data.user
    localStorage.setItem('user', JSON.stringify(safeUser))
    setUser(safeUser)
    return safeUser
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authApi.me()
      const { password_hash, ...safeUser } = fresh
      localStorage.setItem('user', JSON.stringify(safeUser))
      setUser(safeUser)
    } catch {}
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
