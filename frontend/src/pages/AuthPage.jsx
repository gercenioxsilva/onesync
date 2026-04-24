import React, { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useGoogleLogin } from '@react-oauth/google'
import GoogleIcon from '@mui/icons-material/Google'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import oneSyncLogo from '../assets/onesync-logo-orbit.svg'

const TERMS_CONTENT = `TERMOS DE USO — ONESYNC
Versão 1.0 · Licença MIT (Open Source)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ACEITAÇÃO DOS TERMOS

Ao criar uma conta ou utilizar a plataforma OneSync, você concorda com estes Termos de Uso. Se você não concordar, não utilize o serviço.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. LICENÇA DO SOFTWARE (MIT)

Copyright (c) 2024 OneSync Contributors

É concedida, gratuitamente, a qualquer pessoa que obtenha uma cópia deste software e dos arquivos de documentação associados (o "Software"), permissão para negociar o Software sem restrições, incluindo, sem limitação, os direitos de usar, copiar, modificar, mesclar, publicar, distribuir, sublicenciar e/ou vender cópias do Software, e para permitir que as pessoas a quem o Software é fornecido o façam, sujeito às seguintes condições:

O aviso de copyright acima e este aviso de permissão devem ser incluídos em todas as cópias ou partes substanciais do Software.

O SOFTWARE É FORNECIDO "COMO ESTÁ", SEM GARANTIA DE QUALQUER TIPO, EXPRESSA OU IMPLÍCITA, INCLUINDO, MAS NÃO SE LIMITANDO ÀS GARANTIAS DE COMERCIABILIDADE, ADEQUAÇÃO A UM DETERMINADO FIM E NÃO VIOLAÇÃO. EM NENHUM CASO OS AUTORES OU TITULARES DOS DIREITOS AUTORAIS SERÃO RESPONSÁVEIS POR QUALQUER RECLAMAÇÃO, DANOS OU OUTRA RESPONSABILIDADE, SEJA EM UMA AÇÃO DE CONTRATO, ATO ILÍCITO OU DE OUTRA FORMA, DECORRENTE DE, FORA DE OU EM CONEXÃO COM O SOFTWARE OU O USO OU OUTRAS NEGOCIAÇÕES NO SOFTWARE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. USO DA PLATAFORMA

3.1 Você é responsável por manter a confidencialidade das suas credenciais de acesso.

3.2 É proibido utilizar a plataforma para fins ilegais, fraudulentos ou que violem direitos de terceiros.

3.3 Você concorda em fornecer informações verdadeiras no cadastro da empresa.

3.4 O uso indevido pode resultar na suspensão ou encerramento da conta.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. DADOS E PRIVACIDADE

4.1 Os dados inseridos na plataforma são de sua responsabilidade e propriedade.

4.2 A OneSync não comercializa dados pessoais de usuários.

4.3 Dados podem ser processados por serviços de infraestrutura terceiros (AWS) em conformidade com a LGPD e GDPR.

4.4 Backups e disponibilidade são realizados com base nas melhores práticas, mas não há garantia de SLA no plano gratuito.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. DISPONIBILIDADE

O serviço é disponibilizado "no estado em que se encontra". A OneSync não garante disponibilidade ininterrupta e pode realizar manutenções sem aviso prévio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. MODIFICAÇÕES

Estes Termos podem ser atualizados a qualquer momento. O uso continuado da plataforma após alterações constitui aceite dos novos termos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7. CONTATO

Para dúvidas sobre estes termos, entre em contato pelo repositório oficial do projeto em github.com/onesync.
`

const initialLogin = {
  email: 'admin@people.local',
  password: 'admin123',
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

export default function AuthPage({ googleClientId = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, login, loginGoogle, registerTenant } = useAuth()
  const [tab, setTab] = useState(0)
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [tenantForm, setTenantForm] = useState(initialTenant)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)

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
      setFeedback({
        severity: 'error',
        message: error?.response?.data?.detail || 'Falha no login.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
    onSuccess: async (codeResponse) => {
      setLoading(true)
      setFeedback(null)
      try {
        await loginGoogle(codeResponse.code)
        finishLogin()
      } catch (error) {
        const detail = error?.response?.data?.detail
        if (error?.response?.status === 404 && detail?.code === 'tenant_not_found') {
          setTab(1)
          setTermsAccepted(false)
          setTenantForm((current) => ({
            ...current,
            owner_email: detail.email || '',
            owner_name: detail.name || '',
          }))
          setFeedback({
            severity: 'info',
            message: `Conta Google identificada (${detail.email}). Complete o cadastro da sua empresa para acessar o OneSync.`,
          })
        } else {
          setFeedback({
            severity: 'error',
            message: typeof detail === 'string' ? detail : 'Falha no login com Google.',
          })
        }
      } finally {
        setLoading(false)
      }
    },
    onError: () =>
      setFeedback({ severity: 'error', message: 'Falha ao autenticar com Google.' }),
  })

  const handleRegisterTenant = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      await registerTenant({
        ...tenantForm,
        collaborator_quota: Number(tenantForm.collaborator_quota),
      })
      setFeedback({
        severity: 'success',
        message: 'Tenant criado com sucesso. Faça login com o owner cadastrado.',
      })
      setTab(0)
      setLoginForm((current) => ({
        ...current,
        email: tenantForm.owner_email,
        password: tenantForm.owner_password,
      }))
    } catch (error) {
      setFeedback({
        severity: 'error',
        message: error?.response?.data?.detail || 'Falha ao criar tenant.',
      })
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
        background: 'linear-gradient(135deg, #0F172A 0%, #172554 50%, #0F766E 100%)',
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
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                lineHeight: 1.05,
                mb: 2,
                fontSize: { xs: '2.5rem', md: '4rem' },
              }}
            >
              Sincronize conversas, desenvolvimento e execução.
            </Typography>
            <Typography
              sx={{
                maxWidth: 620,
                fontSize: { xs: '1rem', md: '1.15rem' },
                color: 'rgba(255,255,255,0.84)',
                mb: 3,
              }}
            >
              Uma experiência única para acompanhar 1:1, PDI, riscos e ações do time com clareza,
              cadência e inteligência operacional.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Paper
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.10)',
                  color: 'white',
                  backdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>1:1 + PDI + Ações</Typography>
              </Paper>
              <Paper
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.10)',
                  color: 'white',
                  backdropFilter: 'blur(14px)',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              >
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
                  Login da plataforma multi-tenant, cadastro da empresa e início do fluxo SSO com
                  Google.
                </Typography>
              </Box>

              <Tabs
                value={tab}
                onChange={(_, value) => {
                  setTab(value)
                  setFeedback(null)
                  if (value === 0) setTermsAccepted(false)
                }}
              >
                <Tab label="Entrar" />
                <Tab label="Cadastrar empresa" />
              </Tabs>

              {feedback && <Alert severity={feedback.severity}>{feedback.message}</Alert>}

              {tab === 0 ? (
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm((current) => ({ ...current, email: e.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Senha"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm((current) => ({ ...current, password: e.target.value }))
                    }
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handlePasswordLogin}
                    disabled={loading}
                  >
                    {loading ? 'Entrando...' : 'Entrar com email e senha'}
                  </Button>

                  {googleClientId && (
                    <>
                      <Divider>ou continue com</Divider>
                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={<GoogleIcon />}
                        onClick={() => handleGoogleLogin()}
                        disabled={loading}
                        fullWidth
                        sx={{
                          textTransform: 'none',
                          borderColor: '#dadce0',
                          color: '#3c4043',
                          '&:hover': { borderColor: '#c6c6c6', bgcolor: '#f8f9fa' },
                        }}
                      >
                        Continuar com Google
                      </Button>
                    </>
                  )}
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <TextField
                    label="Nome da empresa"
                    value={tenantForm.company_name}
                    onChange={(e) =>
                      setTenantForm((current) => ({ ...current, company_name: e.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="CNPJ"
                    value={tenantForm.cnpj}
                    onChange={(e) =>
                      setTenantForm((current) => ({ ...current, cnpj: e.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Email da empresa"
                    value={tenantForm.email}
                    onChange={(e) =>
                      setTenantForm((current) => ({ ...current, email: e.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Endereço"
                    value={tenantForm.address}
                    onChange={(e) =>
                      setTenantForm((current) => ({ ...current, address: e.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Telefone"
                    value={tenantForm.phone}
                    onChange={(e) =>
                      setTenantForm((current) => ({ ...current, phone: e.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Quantidade de colaboradores"
                    type="number"
                    value={tenantForm.collaborator_quota}
                    onChange={(e) =>
                      setTenantForm((current) => ({
                        ...current,
                        collaborator_quota: e.target.value,
                      }))
                    }
                    fullWidth
                  />
                  <TextField
                    select
                    label="Plano"
                    value={tenantForm.plan_type}
                    onChange={(e) =>
                      setTenantForm((current) => ({ ...current, plan_type: e.target.value }))
                    }
                    fullWidth
                  >
                    <MenuItem value="FREE">Free</MenuItem>
                    <MenuItem value="CUSTOM">Custom</MenuItem>
                  </TextField>
                  <Divider>Usuário owner</Divider>
                  <TextField
                    label="Nome do owner"
                    value={tenantForm.owner_name}
                    onChange={(e) =>
                      setTenantForm((current) => ({ ...current, owner_name: e.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Email do owner"
                    value={tenantForm.owner_email}
                    onChange={(e) =>
                      setTenantForm((current) => ({ ...current, owner_email: e.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    label="Senha do owner"
                    type="password"
                    value={tenantForm.owner_password}
                    onChange={(e) =>
                      setTenantForm((current) => ({ ...current, owner_password: e.target.value }))
                    }
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Li e aceito os{' '}
                        <Link
                          component="button"
                          type="button"
                          variant="body2"
                          onClick={() => setTermsOpen(true)}
                          sx={{ fontWeight: 600 }}
                        >
                          Termos de Uso
                        </Link>{' '}
                        (licença MIT · software livre)
                      </Typography>
                    }
                  />
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleRegisterTenant}
                    disabled={loading || !termsAccepted}
                  >
                    {loading ? 'Criando tenant...' : 'Criar empresa'}
                  </Button>

                  <Dialog
                    open={termsOpen}
                    onClose={() => setTermsOpen(false)}
                    maxWidth="md"
                    fullWidth
                    scroll="paper"
                  >
                    <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
                      Termos de Uso — OneSync
                      <IconButton
                        onClick={() => setTermsOpen(false)}
                        size="small"
                        sx={{ position: 'absolute', right: 12, top: 12 }}
                        aria-label="fechar"
                      >
                        ✕
                      </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                      <Typography
                        component="pre"
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                          lineHeight: 1.75,
                          color: 'text.secondary',
                        }}
                      >
                        {TERMS_CONTENT}
                      </Typography>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                      <Button onClick={() => setTermsOpen(false)} color="inherit">
                        Fechar
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => {
                          setTermsAccepted(true)
                          setTermsOpen(false)
                        }}
                      >
                        Li e aceito os termos
                      </Button>
                    </DialogActions>
                  </Dialog>
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
                Comece rápido com o plano base ou evolua para uma experiência integrada e
                personalizada.
              </Typography>
            </Box>

            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}
            >
              {/* Plano Starter */}
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  bgcolor: 'rgba(15,23,42,0.55)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                    Starter
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                    Ideal para começar a gestão de 1:1 e PDI com simplicidade e zero custo inicial.
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    component="span"
                    sx={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}
                  >
                    Gratuito
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.25 }}>
                    para sempre, sem cartão de crédito
                  </Typography>
                </Box>

                <Box
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.35)',
                    borderRadius: 2,
                    p: 1.5,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    25 colaboradores
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                    com recursos essenciais de gestão
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  sx={{
                    background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                    fontWeight: 700,
                    borderRadius: 2,
                    py: 1.25,
                    textTransform: 'none',
                    fontSize: 14,
                    lineHeight: 1.3,
                    '&:hover': { background: 'linear-gradient(90deg, #2563eb, #4f46e5)' },
                  }}
                >
                  Começar grátis
                  <br />
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ opacity: 0.8, fontWeight: 400 }}
                  >
                    Sem cartão de crédito
                  </Typography>
                </Button>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.75}
                  sx={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  <Typography variant="caption">☁</Typography>
                  <Typography variant="caption">Hospedado pela OneSync</Typography>
                </Stack>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Este plano inclui:
                  </Typography>
                  <Stack spacing={0.75}>
                    {[
                      '1 projeto compartilhado',
                      'Até 25 colaboradores',
                      'Gestão de 1:1, PDI e ações',
                      'Visão centralizada do time',
                      'Suporte via fórum',
                    ].map((feature) => (
                      <Stack key={feature} direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ color: '#4ade80', fontSize: 13, lineHeight: 1 }}>
                          ✓
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                          {feature}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Paper>

              {/* Plano Pro */}
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 4,
                  bgcolor: 'rgba(15,23,42,0.55)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.18)',
                  boxShadow: '0 0 0 1px rgba(99,102,241,0.3), 0 16px 40px rgba(8,47,73,0.22)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                    Pro
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                    Para equipes que precisam de integrações, automação e experiência sob medida
                    para escalar.
                  </Typography>
                </Box>

                <Box>
                  <Stack direction="row" alignItems="baseline" spacing={0.5}>
                    <Typography
                      component="span"
                      sx={{ fontSize: 36, fontWeight: 900, lineHeight: 1 }}
                    >
                      Sob consulta
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.25 }}>
                    personalizado para sua operação
                  </Typography>
                </Box>

                <Box
                  sx={{
                    bgcolor: 'rgba(99,102,241,0.15)',
                    borderRadius: 2,
                    p: 1.5,
                    border: '1px solid rgba(99,102,241,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Colaboradores ilimitados
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                      número customizável por contrato
                    </Typography>
                  </Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>⌄</Typography>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  sx={{
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    fontWeight: 700,
                    borderRadius: 2,
                    py: 1.25,
                    textTransform: 'none',
                    fontSize: 14,
                    lineHeight: 1.3,
                    '&:hover': { background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' },
                  }}
                >
                  Falar com vendas
                  <br />
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ opacity: 0.8, fontWeight: 400 }}
                  >
                    Demonstração gratuita
                  </Typography>
                </Button>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.75}
                  sx={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  <Typography variant="caption">☁</Typography>
                  <Typography variant="caption">Hospedado pela OneSync</Typography>
                </Stack>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Tudo do Starter, mais:
                  </Typography>
                  <Stack spacing={0.75}>
                    {[
                      'Projetos ilimitados',
                      'Colaboradores sem limite',
                      '7 dias de histórico de insights',
                      'Integrações com Google Meet e Teams',
                      'Fluxos personalizados sob demanda',
                      'Funções de administrador',
                      'Variáveis globais',
                      'Histórico de reuniões e PDIs',
                    ].map((feature) => (
                      <Stack key={feature} direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ color: '#4ade80', fontSize: 13, lineHeight: 1 }}>
                          ✓
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                          {feature}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Paper>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  )
}
