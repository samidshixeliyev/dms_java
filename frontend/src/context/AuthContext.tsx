import React, { createContext, useContext, useState, useEffect } from 'react'
import type { AuthUser } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  isAdmin: () => boolean
  isManager: () => boolean
  canManage: () => boolean
  isExecutor: () => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('dms_token'))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('dms_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('dms_token', newToken)
    localStorage.setItem('dms_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('dms_token')
    localStorage.removeItem('dms_user')
    setToken(null)
    setUser(null)
  }

  const isAdmin    = () => user?.role === 'admin'
  const isManager  = () => user?.role === 'manager'
  const canManage  = () => user?.role === 'admin' || user?.role === 'manager'
  const isExecutor = () => user?.role === 'executor'

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, isManager, canManage, isExecutor }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
