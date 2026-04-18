import React, { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteIcon from '@mui/icons-material/Delete'
import { tenantsAPI, usersAPI } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import AIConfigTab from './AIConfigTab'

const ROLE_LABELS = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  TECH_LEAD: 'Tech Lead',
  MEMBER: 'Membro',
}

const ROLE_COLORS = {
  OWNER: 'error',
  ADMIN: 'warning',
  TECH_LEAD: 'info',
  MEMBER: 'default',
}

const INVITABLE_ROLES = ['ADMIN', 'TECH_LEAD', 'MEMBER']

const emptyInvite = { full_name: '', email: '', role: 'MEMBER', password: '' }

export default function SettingsPage() {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState(0)

  // ── Users state ──────────────────────────────────────────────
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersFeedback, setUsersFeedback] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState(emptyInvite)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [roleEditId, setRoleEditId] = useState(null)
  const [roleEditValue, setRoleEditValue] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ── Tenant state ─────────────────────────────────────────────
  const [tenant, setTenant] = useState(null)
  const [tenantLoading, setTenantLoading] = useState(false)
  const [tenantFeedback, setTenantFeedback] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [tenantForm, setTenantForm] = useState({})

  const canManage = ['OWNER', 'ADMIN'].includes(currentUser?.role)

  // ── Load users ────────────────────────────────────────────────
  const loadUsers = () => {
    setUsersLoading(true)
    usersAPI
      .list()
      .then((res) => setUsers(res.data))
      .catch(() => setUsersFeedback({ severity: 'error', message: 'Erro ao carregar usuários.' }))
      .finally(() => setUsersLoading(false))
  }

  // ── Load tenant ───────────────────────────────────────────────
  const loadTenant = () => {
    setTenantLoading(true)
    tenantsAPI
      .me()
      .then((res) => {
        setTenant(res.data)
        setTenantForm({
          name: res.data.name,
          email: res.data.email,
          address: res.data.address,
          phone: res.data.phone,
          collaborator_quota: res.data.collaborator_quota,
        })
      })
      .catch(() => setTenantFeedback({ severity: 'error', message: 'Erro ao carregar dados da empresa.' }))
      .finally(() => setTenantLoading(false))
  }

  useEffect(() => {
    if (tab === 0) loadUsers()
    if (tab === 1) loadTenant()
  }, [tab])

  // ── Invite ────────────────────────────────────────────────────
  const handleInvite = async () => {
    setInviteLoading(true)
    setUsersFeedback(null)
    try {
      const created = await usersAPI.invite(inviteForm)
      setUsers((current) => [...current, created.data])
      setInviteOpen(false)
      setInviteForm(emptyInvite)
      setUsersFeedback({ severity: 'success', message: `Usuário ${inviteForm.email} convidado com sucesso.` })
    } catch (err) {
      setUsersFeedback({
        severity: 'error',
        message: err?.response?.data?.detail || 'Erro ao convidar usuário.',
      })
    } finally {
      setInviteLoading(false)
    }
  }

  // ── Role change ───────────────────────────────────────────────
  const handleSaveRole = async (userId) => {
    setUsersFeedback(null)
    try {
      const res = await usersAPI.updateRole(userId, roleEditValue)
      setUsers((current) => current.map((u) => (u.id === userId ? res.data : u)))
      setRoleEditId(null)
    } catch (err) {
      setUsersFeedback({
        severity: 'error',
        message: err?.response?.data?.detail || 'Erro ao atualizar role.',
      })
    }
  }

  // ── Activate / deactivate ────────────────────────────────────
  const handleToggleActive = async (user) => {
    setUsersFeedback(null)
    try {
      const res = await (user.is_active ? usersAPI.deactivate(user.id) : usersAPI.activate(user.id))
      setUsers((current) => current.map((u) => (u.id === user.id ? res.data : u)))
    } catch (err) {
      setUsersFeedback({
        severity: 'error',
        message: err?.response?.data?.detail || 'Erro ao alterar status.',
      })
    }
  }

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async () => {
    setUsersFeedback(null)
    try {
      await usersAPI.remove(deleteConfirm.id)
      setUsers((current) => current.filter((u) => u.id !== deleteConfirm.id))
      setDeleteConfirm(null)
    } catch (err) {
      setUsersFeedback({
        severity: 'error',
        message: err?.response?.data?.detail || 'Erro ao remover usuário.',
      })
      setDeleteConfirm(null)
    }
  }

  // ── Tenant save ───────────────────────────────────────────────
  const handleSaveTenant = async () => {
    setTenantFeedback(null)
    setTenantLoading(true)
    try {
      const res = await tenantsAPI.update({
        name: tenantForm.name,
        email: tenantForm.email,
        address: tenantForm.address,
        phone: tenantForm.phone,
        collaborator_quota: Number(tenantForm.collaborator_quota),
      })
      setTenant(res.data)
      setEditMode(false)
      setTenantFeedback({ severity: 'success', message: 'Dados da empresa atualizados.' })
    } catch (err) {
      setTenantFeedback({
        severity: 'error',
        message: err?.response?.data?.detail || 'Erro ao salvar empresa.',
      })
    } finally {
      setTenantLoading(false)
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Configurações
        </Typography>
        <Typography color="text.secondary">
          Gestão de usuários, roles e dados da empresa.
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Usuários" />
        <Tab label="Empresa" />
        <Tab label="IA" />
      </Tabs>

      {/* ──────────── USERS TAB ──────────── */}
      {tab === 0 && (
        <Box>
          {usersFeedback && (
            <Alert severity={usersFeedback.severity} sx={{ mb: 2 }} onClose={() => setUsersFeedback(null)}>
              {usersFeedback.message}
            </Alert>
          )}

          {canManage && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => { setInviteOpen(true); setUsersFeedback(null) }}
              >
                Convidar usuário
              </Button>
            </Box>
          )}

          <TableContainer component={Paper} sx={{ borderRadius: 1 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="center">Status</TableCell>
                  {canManage && <TableCell align="right">Ações</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id
                  const isOwner = u.role === 'OWNER'
                  const editingRole = roleEditId === u.id

                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: isOwner ? 'error.main' : 'primary.main' }}>
                            {u.full_name?.slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {u.full_name}
                              {isSelf && (
                                <Chip label="você" size="small" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                              )}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                      </TableCell>
                      <TableCell>
                        {editingRole ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                              select
                              size="small"
                              value={roleEditValue}
                              onChange={(e) => setRoleEditValue(e.target.value)}
                              sx={{ minWidth: 130 }}
                            >
                              {INVITABLE_ROLES.map((r) => (
                                <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>
                              ))}
                            </TextField>
                            <Button size="small" variant="contained" onClick={() => handleSaveRole(u.id)}>
                              Salvar
                            </Button>
                            <Button size="small" onClick={() => setRoleEditId(null)}>Cancelar</Button>
                          </Stack>
                        ) : (
                          <Chip
                            label={ROLE_LABELS[u.role] || u.role}
                            color={ROLE_COLORS[u.role] || 'default'}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={u.is_active ? 'Ativo' : 'Inativo'}
                          color={u.is_active ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      {canManage && (
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {!isOwner && !isSelf && (
                              <Tooltip title="Editar role">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setRoleEditId(u.id)
                                    setRoleEditValue(u.role)
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {!isOwner && !isSelf && (
                              <Tooltip title={u.is_active ? 'Desativar' : 'Ativar'}>
                                <IconButton size="small" onClick={() => handleToggleActive(u)}>
                                  {u.is_active
                                    ? <BlockIcon fontSize="small" color="warning" />
                                    : <CheckCircleIcon fontSize="small" color="success" />}
                                </IconButton>
                              </Tooltip>
                            )}
                            {currentUser?.role === 'OWNER' && !isOwner && !isSelf && (
                              <Tooltip title="Remover usuário">
                                <IconButton size="small" color="error" onClick={() => setDeleteConfirm(u)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
                {!usersLoading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ──────────── COMPANY TAB ──────────── */}
      {tab === 1 && (
        <Box>
          {tenantFeedback && (
            <Alert severity={tenantFeedback.severity} sx={{ mb: 2 }} onClose={() => setTenantFeedback(null)}>
              {tenantFeedback.message}
            </Alert>
          )}

          {tenant && (
            <Paper sx={{ p: 3, borderRadius: 1, maxWidth: 640 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Dados da empresa</Typography>
                {canManage && !editMode && (
                  <Button startIcon={<EditIcon />} size="small" onClick={() => setEditMode(true)}>
                    Editar
                  </Button>
                )}
              </Box>

              <Stack spacing={2}>
                {/* Readonly fields */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 1, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>CNPJ</Typography>
                  <Typography variant="body2">{tenant.cnpj}</Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Plano</Typography>
                  <Box>
                    <Chip
                      label={tenant.plan_type === 'FREE' ? 'Free' : 'Custom'}
                      color={tenant.plan_type === 'FREE' ? 'default' : 'primary'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Criado em</Typography>
                  <Typography variant="body2">{new Date(tenant.created_at).toLocaleDateString('pt-BR')}</Typography>
                </Box>

                <Divider />

                {/* Editable fields */}
                {editMode ? (
                  <Stack spacing={2}>
                    <TextField
                      label="Nome da empresa"
                      value={tenantForm.name}
                      onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="Email da empresa"
                      value={tenantForm.email}
                      onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="Endereço"
                      value={tenantForm.address}
                      onChange={(e) => setTenantForm({ ...tenantForm, address: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="Telefone"
                      value={tenantForm.phone}
                      onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="Cota de colaboradores"
                      type="number"
                      value={tenantForm.collaborator_quota}
                      onChange={(e) => setTenantForm({ ...tenantForm, collaborator_quota: e.target.value })}
                      fullWidth
                    />
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" onClick={handleSaveTenant} disabled={tenantLoading}>
                        {tenantLoading ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button onClick={() => { setEditMode(false); setTenantFeedback(null) }}>
                        Cancelar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 1, alignItems: 'start' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Nome</Typography>
                    <Typography variant="body2">{tenant.name}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Email</Typography>
                    <Typography variant="body2">{tenant.email}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Endereço</Typography>
                    <Typography variant="body2">{tenant.address || '—'}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Telefone</Typography>
                    <Typography variant="body2">{tenant.phone || '—'}</Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Cota</Typography>
                    <Typography variant="body2">{tenant.collaborator_quota} colaboradores</Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          )}
        </Box>
      )}

        {/* ──────────── AI TAB ──────────── */}
        {tab === 2 && (
          <AIConfigTab />
        )}

      {/* ──────────── INVITE DIALOG ──────────── */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Convidar usuário</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Nome completo"
              value={inviteForm.full_name}
              onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="usuario@empresa.com"
              fullWidth
            />
            <TextField
              select
              label="Role"
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              fullWidth
            >
              {INVITABLE_ROLES.map((r) => (
                <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Senha provisória"
              type="password"
              value={inviteForm.password}
              onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
              helperText="Mínimo 8 caracteres. O usuário poderá alterar depois."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleInvite}
            disabled={inviteLoading || !inviteForm.full_name || !inviteForm.email || !inviteForm.password}
          >
            {inviteLoading ? 'Convidando...' : 'Convidar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ──────────── DELETE CONFIRM DIALOG ──────────── */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Remover usuário</DialogTitle>
        <DialogContent>
          <Typography>
            Deseja remover permanentemente <strong>{deleteConfirm?.full_name}</strong> ({deleteConfirm?.email})?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Remover</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
