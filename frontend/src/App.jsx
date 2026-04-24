import React, { useEffect, useState } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import CollaboratorsPage from './pages/CollaboratorsPage'
import CollaboratorDetailPage from './pages/CollaboratorDetailPage'
import OneOnOnesPage from './pages/OneOnOnesPage'
import PdiPage from './pages/PdiPage'
import ActionsPage from './pages/ActionsPage'
import OKRsPage from './pages/OKRsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#707070' },
    background: { default: '#f4f6fb' },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontSize: '2rem', fontWeight: 700 },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 1 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 1 } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 1 } } },
  },
})

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function App() {
  const [googleClientId, setGoogleClientId] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => setGoogleClientId(''), 3000)
    fetch(`${API_URL}/auth/config`)
      .then((r) => {
        if (!r.ok) throw new Error('config unavailable')
        return r.json()
      })
      .then((data) => {
        const id = data.google_client_id
        setGoogleClientId(id && id !== 'null' ? id : '')
      })
      .catch(() => setGoogleClientId(''))
      .finally(() => clearTimeout(timeout))
  }, [])

  // Aguarda o fetch; se demorar >3s, libera o render sem SSO
  if (googleClientId === null) return null

  // Always wrap with GoogleOAuthProvider so useGoogleLogin can be called unconditionally.
  // When googleClientId is empty the Google button is hidden, so no real auth is triggered.
  return (
    <GoogleOAuthProvider clientId={googleClientId || 'no-client-id'}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage googleClientId={googleClientId} />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/collaborators" element={<CollaboratorsPage />} />
                <Route path="/collaborators/:id" element={<CollaboratorDetailPage />} />
                <Route path="/one-on-ones" element={<OneOnOnesPage />} />
                <Route path="/pdis" element={<PdiPage />} />
                <Route path="/actions" element={<ActionsPage />} />
                <Route path="/okrs" element={<OKRsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}
