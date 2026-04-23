import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
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
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#707070',
    },
    background: {
      default: '#f4f6fb',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontSize: '2rem',
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 1,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 1,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 1,
        },
      },
    },
  },
})

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

function App() {
  // null = ainda carregando; '' = carregado sem client_id; string = client_id válido
  const [googleClientId, setGoogleClientId] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/auth/config`)
      .then((r) => r.json())
      .then((data) => setGoogleClientId(data.google_client_id || ''))
      .catch(() => setGoogleClientId(''))
  }, [])

  // Aguarda o fetch antes de montar o GoogleOAuthProvider para que ele
  // receba o clientId correto desde o primeiro mount (a biblioteca GSI
  // não reinicializa quando a prop muda após o mount).
  if (googleClientId === null) return null

  const routes = (
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
  )

  if (!googleClientId) return routes

  return <GoogleOAuthProvider clientId={googleClientId}>{routes}</GoogleOAuthProvider>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
