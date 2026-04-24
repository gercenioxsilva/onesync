import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { googleLogout } from '@react-oauth/google'
import { authAPI } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(authAPI.getSession())
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      const token = authAPI.getToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await authAPI.me()
        setCurrentUser(response.data)
      } catch {
        authAPI.logout()
        setSession(null)
        setCurrentUser(null)
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])

  const value = useMemo(
    () => ({
      session,
      currentUser,
      loading,
      isAuthenticated: Boolean(session?.access_token),
      login: async (email, password) => {
        const nextSession = await authAPI.login(email, password)
        setSession(nextSession)
        const response = await authAPI.me()
        setCurrentUser(response.data)
        return nextSession
      },
      loginGoogle: async (idToken, tenantCnpj) => {
        const nextSession = await authAPI.loginGoogle(idToken, tenantCnpj)
        setSession(nextSession)
        const response = await authAPI.me()
        setCurrentUser(response.data)
        return nextSession
      },
      registerTenant: (payload) => authAPI.registerTenant(payload),
      logout: () => {
        googleLogout()
        authAPI.logout()
        setSession(null)
        setCurrentUser(null)
      },
    }),
    [session, currentUser, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
