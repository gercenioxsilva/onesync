import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { actionsAPI, collaboratorsAPI, oneOnOnesAPI, pdisAPI } from '../api/client'

export default function CollaboratorsPage() {
  const fileInputRef = useRef(null)
  const [collaborators, setCollaborators] = useState([])
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('TODOS')
  const [importFeedback, setImportFeedback] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importOptions, setImportOptions] = useState({
    updateExisting: true,
    enrichFromTxt: true,
  })
  const [newCollab, setNewCollab] = useState({
    name: '',
    email: '',
    squad: '',
    tech_lead_id: '',
    role: '',
    focus: '',
  })
  const [selectedCollaborator, setSelectedCollaborator] = useState(null)
  const [selectedCollaboratorDetails, setSelectedCollaboratorDetails] = useState({
    oneOnOnes: [],
    pdi: null,
    actions: [],
    loading: false,
  })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingCollab, setEditingCollab] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const formatDate = (value) => {
    if (!value) {
      return '-'
    }
    const normalized = String(value).trim()
    const datePart = normalized.includes('T') ? normalized.split('T')[0] : normalized
    const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) {
      const [, year, month, day] = match
      return `${day}/${month}/${year}`
    }

    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) {
      return normalized
    }

    return parsed.toLocaleDateString('pt-BR')
  }

  const isValidEmail = (value) => {
    const normalized = (value || '').trim().toLowerCase()
    if (!normalized) {
      return true
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  }

  useEffect(() => {
    loadCollaborators()
  }, [])

  const loadCollaborators = () => {
    collaboratorsAPI
      .list()
      .then((res) => setCollaborators(res.data))
      .catch(() => setCollaborators([]))
  }

  const handleSelectCollaborator = (collaborator) => {
    setSelectedCollaborator(collaborator)
    setSelectedCollaboratorDetails({ oneOnOnes: [], pdi: null, actions: [], loading: true })
    
    Promise.all([
      oneOnOnesAPI.listByCollaborator(collaborator.id)
        .then((res) => res.data)
        .catch(() => []),
      pdisAPI.listByCollaborator(collaborator.id)
        .then((res) => res.data[0])
        .catch(() => null),
      actionsAPI.list()
        .then((res) => res.data.filter((item) => item.collaborator_id === collaborator.id && item.status !== 'CONCLUIDO'))
        .catch(() => []),
    ])
      .then(([oneOnOnes, pdi, actions]) => {
        setSelectedCollaboratorDetails({
          oneOnOnes,
          pdi,
          actions,
          loading: false,
        })
      })
  }

  const handleCloseDetails = () => {
    setSelectedCollaborator(null)
    setSelectedCollaboratorDetails({ oneOnOnes: [], pdi: null, actions: [], loading: false })
  }

  const handleOpenEditDialog = (collaborator) => {
    setEditingCollab({ ...collaborator })
    setEditDialogOpen(true)
  }

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false)
    setEditingCollab(null)
  }

  const handleSaveEdit = async () => {
    if (!editingCollab?.name?.trim()) {
      setImportFeedback({
        severity: 'error',
        message: 'Nome do colaborador é obrigatório',
        details: [],
      })
      return
    }

    if (!isValidEmail(editingCollab?.email)) {
      setImportFeedback({
        severity: 'error',
        message: 'Email do colaborador inválido',
        details: [],
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await collaboratorsAPI.update(editingCollab.id, {
        name: editingCollab.name,
        email: editingCollab.email || '',
        squad: editingCollab.squad || '',
        tech_lead_id: editingCollab.tech_lead_id || null,
        role: editingCollab.role,
        focus: editingCollab.focus,
      })
      const updatedCollaborator = response.data

      setCollaborators((current) => current.map((item) => (
        item.id === updatedCollaborator.id ? updatedCollaborator : item
      )))
      setImportFeedback({
        severity: 'success',
        message: `Colaborador ${updatedCollaborator.name} atualizado com sucesso!`,
        details: [],
      })
      handleCloseEditDialog()
      if (selectedCollaborator?.id === updatedCollaborator.id) {
        setSelectedCollaborator(updatedCollaborator)
      }
    } catch (error) {
      setImportFeedback({
        severity: 'error',
        message: error?.response?.data?.detail || 'Erro ao atualizar colaborador',
        details: [],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDeleteConfirm = (id) => {
    setDeleteConfirmId(id)
    setDeleteConfirmOpen(true)
  }

  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false)
    setDeleteConfirmId(null)
  }

  const handleConfirmDelete = async () => {
    setIsLoading(true)
    try {
      await collaboratorsAPI.delete(deleteConfirmId)
      setCollaborators((current) => current.filter((item) => item.id !== deleteConfirmId))
      setImportFeedback({
        severity: 'success',
        message: 'Colaborador excluído com sucesso!',
        details: [],
      })
      handleCloseDeleteConfirm()
      handleCloseDetails()
    } catch (error) {
      setImportFeedback({
        severity: 'error',
        message: error?.response?.data?.detail || 'Erro ao excluir colaborador',
        details: [],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    if (!newCollab.name?.trim()) {
      setImportFeedback({
        severity: 'error',
        message: 'Nome do colaborador é obrigatório',
        details: [],
      })
      return
    }

    if (!isValidEmail(newCollab.email)) {
      setImportFeedback({
        severity: 'error',
        message: 'Email do colaborador inválido',
        details: [],
      })
      return
    }

    collaboratorsAPI
      .create(newCollab)
      .then(() => {
        setOpen(false)
        setNewCollab({ name: '', email: '', squad: '', tech_lead_id: '', role: '', focus: '' })
        loadCollaborators()
      })
      .catch((error) => {
        if (!error?.response) {
          setCollaborators((current) => [...current, { ...newCollab, id: String(current.length + 1), risk: 'BAIXO', pdi_status: 'NO_PLANO' }])
          setOpen(false)
          setNewCollab({ name: '', email: '', squad: '', tech_lead_id: '', role: '', focus: '' })
          return
        }

        setImportFeedback({
          severity: 'error',
          message: error?.response?.data?.detail || 'Erro ao cadastrar colaborador',
          details: [],
        })
      })
  }

  const handleRisk = (id, action) => {
    collaboratorsAPI
      .updateRisk(id, action)
      .then(() => loadCollaborators())
      .catch(() => {
        setCollaborators((current) => current.map((c) => {
          if (c.id !== id) return c
          const order = ['BAIXO', 'MEDIO', 'ALTO']
          const idx = order.indexOf(c.risk)
          const nextIdx = action === 'escalate' ? Math.min(idx + 1, 2) : Math.max(idx - 1, 0)
          return { ...c, risk: order[nextIdx] }
        }))
      })
  }

  const handleDelete = (id) => {
    handleOpenDeleteConfirm(id)
  }

  const handleUpdateDirectManager = async (techLeadId) => {
    if (!selectedCollaborator) {
      return
    }

    setIsLoading(true)
    try {
      const response = await collaboratorsAPI.update(selectedCollaborator.id, {
        name: selectedCollaborator.name,
        email: selectedCollaborator.email || '',
        squad: selectedCollaborator.squad || '',
        tech_lead_id: techLeadId || null,
        role: selectedCollaborator.role || '',
        focus: selectedCollaborator.focus || '',
      })

      const updatedCollaborator = response.data
      setCollaborators((current) => current.map((item) => (
        item.id === updatedCollaborator.id ? updatedCollaborator : item
      )))
      setSelectedCollaborator(updatedCollaborator)
      setImportFeedback({
        severity: 'success',
        message: 'Gestor direto atualizado com sucesso!',
        details: [],
      })
    } catch (error) {
      setImportFeedback({
        severity: 'error',
        message: error?.response?.data?.detail || 'Erro ao atualizar gestor direto',
        details: [],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenImport = () => {
    fileInputRef.current?.click()
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await collaboratorsAPI.downloadImportTemplate()
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'modelo_importacao_colaboradores.csv'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setImportFeedback({
        severity: 'error',
        message: 'Não foi possível baixar o modelo CSV.',
        details: [],
      })
    }
  }

  const handleImportFile = async (event) => {
    const [file] = event.target.files || []
    event.target.value = ''
    if (!file) {
      return
    }

    setIsImporting(true)
    setImportFeedback(null)
    try {
      const res = await collaboratorsAPI.importCsv(file, importOptions)
      const summary = res.data
      setImportFeedback({
        severity: 'success',
        message: `Importação concluída: ${summary.imported} novo(s), ${summary.updated} atualizado(s), ${summary.skipped} ignorado(s), ${summary.enriched_from_txt} enriquecido(s) por .txt.`,
        details: summary.errors?.slice(0, 5) || [],
      })
      loadCollaborators()
    } catch (error) {
      setImportFeedback({
        severity: 'error',
        message: error?.response?.data?.detail || 'Não foi possível importar o CSV.',
        details: [],
      })
    } finally {
      setIsImporting(false)
    }
  }

  const filtered = useMemo(() => collaborators.filter((c) => {
    const matchesName = c.name.toLowerCase().includes(filter.toLowerCase())
    const matchesRisk = riskFilter === 'TODOS' || c.risk === riskFilter
    return matchesName && matchesRisk
  }), [collaborators, filter, riskFilter])

  const getRiskColor = (risk) => {
    if (risk === 'ALTO') return 'error'
    if (risk === 'MEDIO') return 'warning'
    return 'success'
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            CRUD de colaboradores
          </Typography>
          <Typography color="text.secondary">
            Cadastro, filtros, risco, foco atual e acesso rápido ao detalhe individual.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
          <Button variant="text" onClick={handleDownloadTemplate}>
            Baixar modelo CSV
          </Button>
          <Button variant="outlined" onClick={handleOpenImport} disabled={isImporting}>
            {isImporting ? 'Importando...' : 'Importar CSV'}
          </Button>
          <Button variant="contained" onClick={() => setOpen(true)}>
            + Novo colaborador
          </Button>
        </Box>
      </Box>

      {importFeedback && (
        <Alert severity={importFeedback.severity} sx={{ mb: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 600 }}>{importFeedback.message}</Typography>
            {importFeedback.details?.length > 0 && (
              <Box component="ul" sx={{ mb: 0, mt: 1, pl: 3 }}>
                {importFeedback.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </Box>
            )}
          </Box>
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2, borderRadius: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField label="Buscar por nome" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 280 }} />
        <TextField select label="Risco" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="TODOS">Todos</MenuItem>
          <MenuItem value="BAIXO">Baixo</MenuItem>
          <MenuItem value="MEDIO">Médio</MenuItem>
          <MenuItem value="ALTO">Alto</MenuItem>
        </TextField>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
          CSV aceito com colunas como `nome`/`name`, `email`, `papel`/`cargo`/`role`, `principal_foco`/`foco`/`focus`, `risco` e `status_pdi`.
        </Typography>
        <FormControlLabel
          control={(
            <Checkbox
              checked={importOptions.updateExisting}
              onChange={(e) => setImportOptions((current) => ({ ...current, updateExisting: e.target.checked }))}
            />
          )}
          label="Atualizar colaboradores existentes"
        />
        <FormControlLabel
          control={(
            <Checkbox
              checked={importOptions.enrichFromTxt}
              onChange={(e) => setImportOptions((current) => ({ ...current, enrichFromTxt: e.target.checked }))}
            />
          )}
          label="Enriquecer cargo/foco usando arquivos .txt"
        />
      </Paper>

        <TableContainer component={Paper} sx={{ borderRadius: 1, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Squad</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Foco</TableCell>
              <TableCell align="center">Risco</TableCell>
              <TableCell align="center">PDI</TableCell>
              <TableCell align="center">Próxima 1:1</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id} sx={{ '&:hover': { bgcolor: '#fafafa', cursor: 'pointer' } }} hover onClick={() => handleSelectCollaborator(c)}>
                <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                <TableCell>{c.email || '-'}</TableCell>
                <TableCell>{c.squad || '-'}</TableCell>
                <TableCell>{c.role}</TableCell>
                <TableCell>{c.focus}</TableCell>
                <TableCell align="center">
                  <Chip label={c.risk} color={getRiskColor(c.risk)} size="small" />
                </TableCell>
                <TableCell align="center">{c.pdi_status}</TableCell>
                <TableCell align="center">{formatDate(c.next_one_on_one)}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(c) }} sx={{ mr: 1 }}>
                    Editar
                  </Button>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); handleRisk(c.id, 'escalate') }} sx={{ mr: 1 }}>
                    ↑
                  </Button>
                  <Button size="small" onClick={(e) => { e.stopPropagation(); handleRisk(c.id, 'reduce') }} sx={{ mr: 1 }}>
                    ↓
                  </Button>
                  <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Drawer
        anchor="right"
        open={!!selectedCollaborator}
        onClose={handleCloseDetails}
        sx={{
          '& .MuiDrawer-paper': {
            width: 400,
            boxSizing: 'border-box',
          },
        }}
      >
        {selectedCollaborator && (
          <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Detalhes
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" onClick={() => { handleOpenEditDialog(selectedCollaborator); handleCloseDetails(); }}>
                  Editar
                </Button>
                <IconButton size="small" onClick={handleCloseDetails}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>

            {selectedCollaboratorDetails.loading && <LinearProgress sx={{ mb: 2 }} />}

            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 20, fontWeight: 700 }}>
                {selectedCollaborator.name?.slice(0, 2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedCollaborator.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedCollaborator.role}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedCollaborator.email || 'Email não informado'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                  Informações
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Risco:</Typography>
                    <Chip
                      label={selectedCollaborator.risk}
                      color={getRiskColor(selectedCollaborator.risk)}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Status PDI:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedCollaborator.pdi_status}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Último 1:1:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatDate(selectedCollaboratorDetails.oneOnOnes?.[0]?.meeting_date || selectedCollaboratorDetails.oneOnOnes?.[0]?.date)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Próx. 1:1:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatDate(selectedCollaborator.next_one_on_one)}
                    </Typography>
                  </Box>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Gestor direto"
                    value={selectedCollaborator.tech_lead_id || ''}
                    onChange={(e) => handleUpdateDirectManager(e.target.value)}
                    disabled={isLoading}
                  >
                    <MenuItem value="">Sem vínculo</MenuItem>
                    {collaborators
                      .filter((item) => item.id !== selectedCollaborator.id)
                      .map((item) => (
                        <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                      ))}
                  </TextField>
                </Box>
              </Box>

              {selectedCollaborator.focus && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                    Foco Atual
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedCollaborator.focus}
                  </Typography>
                </Box>
              )}

              {selectedCollaboratorDetails.pdi && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                    PDI
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedCollaboratorDetails.pdi.goals}
                  </Typography>
                </Box>
              )}

              {selectedCollaboratorDetails.oneOnOnes?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                    1:1 Recentes
                  </Typography>
                  <Stack spacing={1}>
                    {selectedCollaboratorDetails.oneOnOnes.slice(0, 3).map((o) => (
                      <Box key={o.id} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {formatDate(o.meeting_date || o.date)}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {o.summary || o.notes || 'Sem resumo registrado.'}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.75 }}>
                          Próximos passos: {o.next_steps || '-'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {selectedCollaboratorDetails.actions?.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                    Ações Associadas
                  </Typography>
                  <Stack spacing={1}>
                    {selectedCollaboratorDetails.actions.slice(0, 3).map((a) => (
                      <Box key={a.id} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {a.title}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.7 }}>
                          Status: {a.status}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Editar colaborador</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Nome"
            value={editingCollab?.name || ''}
            onChange={(e) => setEditingCollab({ ...editingCollab, name: e.target.value })}
            sx={{ mb: 2 }}
            disabled={isLoading}
          />
          <TextField
            fullWidth
            label="Email"
            value={editingCollab?.email || ''}
            onChange={(e) => setEditingCollab({ ...editingCollab, email: e.target.value })}
            placeholder="nome@empresa.com"
            helperText={editingCollab?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((editingCollab.email || '').trim().toLowerCase()) ? 'Email inválido' : ' '}
            error={!!(editingCollab?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((editingCollab.email || '').trim().toLowerCase()))}
            sx={{ mb: 2 }}
            disabled={isLoading}
          />
          <TextField
            fullWidth
            label="Squad"
            value={editingCollab?.squad || ''}
            onChange={(e) => setEditingCollab({ ...editingCollab, squad: e.target.value })}
            sx={{ mb: 2 }}
            disabled={isLoading}
          />
          <TextField
            select
            fullWidth
            label="Tech Lead"
            value={editingCollab?.tech_lead_id || ''}
            onChange={(e) => setEditingCollab({ ...editingCollab, tech_lead_id: e.target.value || null })}
            sx={{ mb: 2 }}
            disabled={isLoading}
          >
            <MenuItem value="">Sem vínculo</MenuItem>
            {collaborators
              .filter((item) => item.id !== editingCollab?.id)
              .map((item) => (
                <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
              ))}
          </TextField>
          <TextField
            fullWidth
            label="Cargo"
            value={editingCollab?.role || ''}
            onChange={(e) => setEditingCollab({ ...editingCollab, role: e.target.value })}
            sx={{ mb: 2 }}
            disabled={isLoading}
          />
          <TextField
            fullWidth
            label="Foco atual"
            value={editingCollab?.focus || ''}
            onChange={(e) => setEditingCollab({ ...editingCollab, focus: e.target.value })}
            multiline
            rows={3}
            disabled={isLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={isLoading}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} disabled={isLoading}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={isLoading}>
            {isLoading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo colaborador</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Nome"
            value={newCollab.name}
            onChange={(e) => setNewCollab({ ...newCollab, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            value={newCollab.email}
            onChange={(e) => setNewCollab({ ...newCollab, email: e.target.value })}
            placeholder="nome@empresa.com"
            helperText={newCollab.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((newCollab.email || '').trim().toLowerCase()) ? 'Email inválido' : ' '}
            error={!!(newCollab.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((newCollab.email || '').trim().toLowerCase()))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Squad"
            value={newCollab.squad}
            onChange={(e) => setNewCollab({ ...newCollab, squad: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="Tech Lead"
            value={newCollab.tech_lead_id}
            onChange={(e) => setNewCollab({ ...newCollab, tech_lead_id: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="">Sem vínculo</MenuItem>
            {collaborators.map((item) => (
              <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Cargo"
            value={newCollab.role}
            onChange={(e) => setNewCollab({ ...newCollab, role: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Foco atual"
            value={newCollab.focus}
            onChange={(e) => setNewCollab({ ...newCollab, focus: e.target.value })}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
