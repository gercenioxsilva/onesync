import React, { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import authBackground from '../assets/onesync-auth-background.svg'
import oneSyncLogo from '../assets/onesync-logo-orbit.svg'

const initialLogin = {
  email: 'admin@people.local',
  password: 'admin123',
  tenantCnpj: '00000000000191',
  googleIdToken: '',
}

const initialTenant = {
  company_name: '',
  cnpj: '',
  email: '',
  address: '',
  phone: '',
  collaborator_quota: 25,
  plan_type: 'FREE',
  owner_name: '',
  owner_email: '',
  owner_password: '',
}

export default function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login, loginGoogle, registerTenant } = useAuth()
  const [tab, setTab] = useState(0)
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [tenantForm, setTenantForm] = useState(initialTenant)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />
  }

  const finishLogin = () => {
    navigate(location.state?.from?.pathname || '/', { replace: true })
  }

  const handlePasswordLogin = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      await login(loginForm.email, loginForm.password)
      finishLogin()
    } catch (error) {
      setFeedback({ severity: 'error', message: error?.response?.data?.detail || 'Falha no login.' })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      await loginGoogle(loginForm.googleIdToken, loginForm.tenantCnpj)
      finishLogin()
    } catch (error) {
      setFeedback({ severity: 'error', message: error?.response?.data?.detail || 'Falha no login com Google.' })
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterTenant = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      await registerTenant({
        ...tenantForm,
        collaborator_quota: Number(tenantForm.collaborator_quota),
      })
      setFeedback({ severity: 'success', message: 'Tenant criado com sucesso. Faça login com o owner cadastrado.' })
      setTab(0)
      setLoginForm((current) => ({
        ...current,
        email: tenantForm.owner_email,
        tenantCnpj: tenantForm.cnpj,
        password: tenantForm.owner_password,
      }))
    } catch (error) {
      setFeedback({ severity: 'error', message: error?.response?.data?.detail || 'Falha ao criar tenant.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.08)), url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 3, md: 5 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '100vh',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.05fr 0.95fr' },
            gap: 4,
            alignItems: 'center',
            flexGrow: 1,
          }}
        >
          <Box sx={{ color: 'white', pr: { lg: 4 } }}>
            <Box
              component="img"
              src={oneSyncLogo}
              alt="OneSync"
              sx={{ width: { xs: 190, md: 240 }, display: 'block', mb: 2 }}
            />
            <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.05, mb: 2, fontSize: { xs: '2.5rem', md: '4rem' } }}>
              Sincronize conversas, desenvolvimento e execução.
            </Typography>
            <Typography sx={{ maxWidth: 620, fontSize: { xs: '1rem', md: '1.15rem' }, color: 'rgba(255,255,255,0.84)', mb: 3 }}>
              Uma experiência única para acompanhar 1:1, PDI, riscos e ações do time com clareza, cadência e inteligência operacional.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Paper sx={{ px: 2, py: 1.25, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.10)', color: 'white', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <Typography sx={{ fontWeight: 700 }}>1:1 + PDI + Ações</Typography>
              </Paper>
              <Paper sx={{ px: 2, py: 1.25, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.10)', color: 'white', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <Typography sx={{ fontWeight: 700 }}>Fluxo multi-tenant com IA</Typography>
              </Paper>
            </Stack>
          </Box>

          <Paper
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)',
            }}
          >
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  OneSync
                </Typography>
                <Typography color="text.secondary">
                  Login da plataforma multi-tenant, cadastro da empresa e início do fluxo SSO com Google.
                </Typography>
              </Box>

              <Tabs value={tab} onChange={(_, value) => setTab(value)}>
                <Tab label="Entrar" />
                <Tab label="Cadastrar empresa" />
              </Tabs>

              {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

              {tab === 0 ? (
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((current) => ({ ...current, email: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Senha"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((current) => ({ ...current, password: e.target.value }))}
                    fullWidth
                  />
                  <Button variant="contained" size="large" onClick={handlePasswordLogin} disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar com email e senha'}
                  </Button>

                  <Divider>Google SSO</Divider>

                  <TextField
                    label="CNPJ do tenant"
                    value={loginForm.tenantCnpj}
                    onChange={(e) => setLoginForm((current) => ({ ...current, tenantCnpj: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Google ID Token"
                    value={loginForm.googleIdToken}
                    onChange={(e) => setLoginForm((current) => ({ ...current, googleIdToken: e.target.value }))}
                    multiline
                    rows={3}
                    fullWidth
                    helperText="Integração inicial: cole aqui o ID token do Google até adicionarmos o botão OAuth completo."
                  />
                  <Button variant="outlined" size="large" onClick={handleGoogleLogin} disabled={loading || !loginForm.googleIdToken || !loginForm.tenantCnpj}>
                    {loading ? 'Validando...' : 'Entrar com Google'}
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <TextField label="Nome da empresa" value={tenantForm.company_name} onChange={(e) => setTenantForm((current) => ({ ...current, company_name: e.target.value }))} fullWidth />
                  <TextField label="CNPJ" value={tenantForm.cnpj} onChange={(e) => setTenantForm((current) => ({ ...current, cnpj: e.target.value }))} fullWidth />
                  <TextField label="Email da empresa" value={tenantForm.email} onChange={(e) => setTenantForm((current) => ({ ...current, email: e.target.value }))} fullWidth />
                  <TextField label="Endereço" value={tenantForm.address} onChange={(e) => setTenantForm((current) => ({ ...current, address: e.target.value }))} fullWidth />
                  <TextField label="Telefone" value={tenantForm.phone} onChange={(e) => setTenantForm((current) => ({ ...current, phone: e.target.value }))} fullWidth />
                  <TextField label="Quantidade de colaboradores" type="number" value={tenantForm.collaborator_quota} onChange={(e) => setTenantForm((current) => ({ ...current, collaborator_quota: e.target.value }))} fullWidth />
                  <TextField select label="Plano" value={tenantForm.plan_type} onChange={(e) => setTenantForm((current) => ({ ...current, plan_type: e.target.value }))} fullWidth>
                    <MenuItem value="FREE">Free</MenuItem>
                    <MenuItem value="CUSTOM">Custom</MenuItem>
                  </TextField>
                  <Divider>Usuário owner</Divider>
                  <TextField label="Nome do owner" value={tenantForm.owner_name} onChange={(e) => setTenantForm((current) => ({ ...current, owner_name: e.target.value }))} fullWidth />
                  <TextField label="Email do owner" value={tenantForm.owner_email} onChange={(e) => setTenantForm((current) => ({ ...current, owner_email: e.target.value }))} fullWidth />
                  <TextField label="Senha do owner" type="password" value={tenantForm.owner_password} onChange={(e) => setTenantForm((current) => ({ ...current, owner_password: e.target.value }))} fullWidth />
                  <Button variant="contained" size="large" onClick={handleRegisterTenant} disabled={loading}>
                    {loading ? 'Criando tenant...' : 'Criar empresa'}
                  </Button>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Box>

        <Box sx={{ pt: 4 }}>
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              borderRadius: 5,
              bgcolor: 'rgba(255,255,255,0.08)',
              color: 'white',
              backdropFilter: 'blur(18px)',
              border: '1px solid rgba(255,255,255,0.14)',
            }}
          >
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                Escolha o modelo ideal para sua operação
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                Comece rápido com o plano base ou evolua para uma experiência integrada e personalizada.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  bgcolor: 'rgba(15,23,42,0.26)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Plano Free
                  </Typography>
                  <Chip
                    label="Entrada rápida"
                    size="small"
                    sx={{ bgcolor: 'rgba(34,197,94,0.18)', color: '#D1FAE5', fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)', mb: 2 }}>
                  Ideal para começar a gestão de 1:1 e PDI com simplicidade, velocidade e zero custo inicial.
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">✓ Colaboradores ilimitados</Typography>
                  <Typography variant="body2">✓ Gestão de 1:1, PDI e ações</Typography>
                  <Typography variant="body2">✓ Visão centralizada do time</Typography>
                </Stack>
              </Paper>

              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(34,197,94,0.10))',
                  color: 'white',
                  border: '1px solid rgba(125,211,252,0.28)',
                  boxShadow: '0 16px 40px rgba(8, 47, 73, 0.22)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -18,
                    right: -18,
                    width: 110,
                    height: 110,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.08)',
                  }}
                />
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5, position: 'relative' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Plano Custom
                  </Typography>
                  <Chip
                    label="Mais completo"
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'white', fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.86)', mb: 2, position: 'relative' }}>
                  Para operações que precisam de integração, automação e uma experiência sob medida para escalar a gestão.
                </Typography>
                <Stack spacing={1} sx={{ position: 'relative' }}>
                  <Typography variant="body2">✓ Integrações com Google Meet e Microsoft Teams</Typography>
                  <Typography variant="body2">✓ Fluxos personalizados e evoluções sob demanda</Typography>
                  <Typography variant="body2">✓ Experiência alinhada à realidade da empresa</Typography>
                </Stack>
              </Paper>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}
