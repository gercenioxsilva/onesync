import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Chip,
} from '@mui/material'
import { pdisAPI, collaboratorsAPI } from '../api/client'

export default function PdiPage() {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [pdis, setPdis] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [newPdi, setNewPdi] = useState({
    collaborator_id: '',
    cycle: '2026_H1',
    objective: '',
    smart_goal_1: '',
    smart_goal_2: '',
    progress: 0,
    status: 'EM_VOLTA',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    // Load collaborators
    collaboratorsAPI
      .list()
      .then((res) => setCollaborators(res.data))
      .catch(() => setCollaborators([]))

    // Load PDIs
    pdisAPI
      .list()
      .then((res) => setPdis(res.data))
      .catch(() => setPdis([]))
  }

  const handleCreate = () => {
    pdisAPI
      .create(newPdi)
      .then(() => {
        setOpen(false)
        setNewPdi({
          collaborator_id: '',
          cycle: '2026_H1',
          objective: '',
          smart_goal_1: '',
          smart_goal_2: '',
          progress: 0,
          status: 'EM_VOLTA',
        })
        loadData()
      })
      .catch(() => {})
  }

  const handleOpenEdit = (item) => {
    setEditingId(item.id)
    setNewPdi({
      collaborator_id: item.collaborator_id,
      cycle: item.cycle,
      objective: item.objective,
      smart_goal_1: item.smart_goal_1 ?? item.goals?.[0] ?? '',
      smart_goal_2: item.smart_goal_2 ?? item.goals?.[1] ?? '',
      progress: item.progress ?? 0,
      status: item.status ?? 'EM_VOLTA',
    })
    setOpen(true)
  }

  const handleSave = () => {
    if (editingId) {
      pdisAPI
        .update(editingId, newPdi)
        .then(() => {
          setOpen(false)
          setEditingId(null)
          loadData()
        })
        .catch(() => {})
      return
    }

    handleCreate()
  }

  const handleDelete = (id) => {
    pdisAPI
      .delete(id)
      .then(() => loadData())
      .catch(() => {})
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>CRUD de PDI</Typography>
          <Typography color="text.secondary">Metas SMART, progresso, checkpoints e encerramento de ciclo.</Typography>
        </Box>
        <Button variant="contained" onClick={() => setOpen(true)}>
          + Novo PDI
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 1, mb: 3, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Colaborador</TableCell>
              <TableCell>Ciclo</TableCell>
              <TableCell>Objetivo</TableCell>
              <TableCell width="220">Progresso</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pdis.map((item) => {
              const collaborator = collaborators.find((c) => c.id === item.collaborator_id)
              return (
                <TableRow key={item.id} hover>
                  <TableCell>{collaborator?.name || item.collaborator_name}</TableCell>
                  <TableCell>{item.cycle}</TableCell>
                  <TableCell>{item.objective}</TableCell>
                  <TableCell>
                    <LinearProgress
                      variant="determinate"
                      value={item.progress}
                      sx={{ height: 8, borderRadius: 999, mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {item.progress}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      color={item.progress >= 80 ? 'success' : item.progress > 0 ? 'info' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleOpenEdit(item)} sx={{ mr: 1 }}>
                      Editar
                    </Button>
                    <Button size="small" color="error" onClick={() => handleDelete(item.id)}>
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Paper sx={{ p: 3, borderRadius: 1 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
          Checkpoints do ciclo
        </Typography>
        <Stack spacing={1.5}>
          <Box sx={{ borderLeft: '4px solid', borderColor: 'primary.main', pl: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>16/04 • Início do plano</Typography>
            <Typography variant="body2" color="text.secondary">
              Metas estruturadas e primeira leitura de progresso.
            </Typography>
          </Box>
          <Box sx={{ borderLeft: '4px solid', borderColor: 'primary.main', pl: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>30/04 • Próximo checkpoint</Typography>
            <Typography variant="body2" color="text.secondary">
              Revisão de entregas, evidências e ajustes de rota.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingId(null)
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editingId ? 'Editar PDI' : 'Novo PDI'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                label="Colaborador"
                value={newPdi.collaborator_id}
                onChange={(e) => setNewPdi({ ...newPdi, collaborator_id: e.target.value })}
                fullWidth
              >
                {collaborators.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Ciclo"
                value={newPdi.cycle}
                onChange={(e) => setNewPdi({ ...newPdi, cycle: e.target.value })}
                fullWidth
              />
              <TextField
                label="Progresso (%)"
                type="number"
                value={newPdi.progress}
                onChange={(e) => setNewPdi({ ...newPdi, progress: Number(e.target.value) })}
                fullWidth
              />
            </Stack>
            <TextField
              label="Objetivo do ciclo"
              multiline
              minRows={3}
              value={newPdi.objective}
              onChange={(e) => setNewPdi({ ...newPdi, objective: e.target.value })}
            />
            <TextField
              label="Meta 1 (SMART)"
              multiline
              minRows={2}
              value={newPdi.smart_goal_1}
              onChange={(e) => setNewPdi({ ...newPdi, smart_goal_1: e.target.value })}
            />
            <TextField
              label="Meta 2 (SMART)"
              multiline
              minRows={2}
              value={newPdi.smart_goal_2}
              onChange={(e) => setNewPdi({ ...newPdi, smart_goal_2: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false)
              setEditingId(null)
            }}
          >
            Cancelar
          </Button>
          <Button variant="outlined">Salvar rascunho</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingId ? 'Atualizar PDI' : 'Salvar PDI'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
