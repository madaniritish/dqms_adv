import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('dqms_token')
    const savedUser = localStorage.getItem('dqms_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  // Session timeout: 30 min idle
  useEffect(() => {
    if (!token) return
    const timeout = setTimeout(() => {
      logout()
    }, 30 * 60 * 1000)

    const reset = () => clearTimeout(timeout)
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [token])

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { token: newToken, user: newUser } = res.data
    localStorage.setItem('dqms_token', newToken)
    localStorage.setItem('dqms_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    return newUser
  }, [])

  const logout = useCallback(async () => {
    try { await authAPI.logout() } catch (_) {}
    localStorage.removeItem('dqms_token')
    localStorage.removeItem('dqms_user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
