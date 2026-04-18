import React from 'react'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import oneSyncLogo from '../assets/onesync-logo-orbit.svg'

const drawerWidth = 260

const sections = [
  { label: 'Dashboard', path: '/' },
  { label: 'Colaboradores', path: '/collaborators' },
  { label: '1:1', path: '/one-on-ones' },
  { label: 'PDI', path: '/pdis' },
  { label: 'Ações', path: '/actions' },
  { label: 'Relatórios', path: '/reports' },
  { label: 'Configurações', path: '/settings' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, session, logout } = useAuth()

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #0f172a, #172554)',
            color: 'white',
            borderRight: 'none',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box
            component="img"
            src={oneSyncLogo}
            alt="OneSync"
            sx={{ width: '100%', maxWidth: 180, display: 'block', mb: 1 }}
          />
          <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
            Plataforma de 1:1, PDI e ações com IA
          </Typography>
        </Box>
        <List sx={{ px: 1 }}>
          {sections.map((item) => {
            const active = location.pathname === item.path
            return (
              <ListItemButton
                key={item.path}
                selected={active}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  color: 'white',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255,255,255,0.14)',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  },
                }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            )
          })}
        </List>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            bgcolor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700 }}>
                OneSync
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {session?.role || 'MEMBER'} • {currentUser?.email || 'Sessão ativa'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 12 }}>
                  {currentUser?.full_name?.slice(0, 2)?.toUpperCase() || 'U'}
                </Avatar>
              </Box>
              <Button variant="outlined" onClick={() => navigate('/reports')}>
                Relatórios
              </Button>
              <Button variant="contained" onClick={() => navigate('/collaborators')}>
                Novo fluxo
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => {
                  logout()
                  navigate('/auth', { replace: true })
                }}
              >
                Sair
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>

        <Box
          component="footer"
          sx={{
            py: 2,
            px: 3,
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center',
            bgcolor: '#ffffff',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            OneSync v1.0 • Blueprint React integrado ao backend Python
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
