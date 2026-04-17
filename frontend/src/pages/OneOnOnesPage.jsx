import React, { useEffect, useMemo, useState } from 'react'
import Sparkles from '@mui/icons-material/Stars'
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useLocation, useNavigate } from 'react-router-dom'
import AIProcessingDialog from '../components/AIProcessingDialog'
import { oneOnOnesAPI, collaboratorsAPI } from '../api/client'

export default function OneOnOnesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [oneOnOnes, setOneOnOnes] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [newOneOnOne, setNewOneOnOne] = useState({
    collaborator_id: '',
    meeting_date: new Date().toISOString().split('T')[0],
    mood_score: '8',
    next_meeting_date: '',
    summary: '',
    next_steps: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (location.state?.openCreate) {
      setEditingId(null)
      setNewOneOnOne({
        collaborator_id: '',
        meeting_date: new Date().toISOString().split('T')[0],
        mood_score: '8',
        next_meeting_date: '',
        summary: '',
        next_steps: '',
      })
      setOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  const loadData = () => {
    // Load collaborators
    collaboratorsAPI
      .list()
      .then((res) => setCollaborators(res.data))
      .catch(() => setCollaborators([]))

    // Load one-on-ones
    oneOnOnesAPI
      .list()
      .then((res) => setOneOnOnes(res.data))
      .catch(() => setOneOnOnes([]))
  }

  const handleAISuccess = (result) => {
    setNewOneOnOne((current) => ({
      ...current,
      summary: result.extracted_summary,
      next_steps: result.extracted_next_steps,
      mood_score: String(result.extracted_mood_score),
    }))
    setAiDialogOpen(false)
  }

  const handleCreate = () => {
    oneOnOnesAPI
      .create(newOneOnOne)
      .then(() => {
        setOpen(false)
        setNewOneOnOne({
          collaborator_id: '',
          meeting_date: new Date().toISOString().split('T')[0],
          mood_score: '8',
          next_meeting_date: '',
          summary: '',
          next_steps: '',
        })
        loadData()
      })
      .catch(() => {})
  }

  const handleOpenEdit = (item) => {
    setEditingId(item.id)
    setNewOneOnOne({
      collaborator_id: item.collaborator_id,
      meeting_date: item.meeting_date,
      mood_score: String(item.mood_score ?? ''),
      next_meeting_date: item.next_meeting_date ?? '',
      summary: item.summary ?? '',
      next_steps: item.next_steps ?? '',
    })
    setOpen(true)
  }

  const handleSave = () => {
    if (editingId) {
      oneOnOnesAPI
        .update(editingId, newOneOnOne)
        .then(() => {
          setOpen(false)
          setEditingId(null)
          setNewOneOnOne({
            collaborator_id: '',
            meeting_date: new Date().toISOString().split('T')[0],
            mood_score: '8',
            next_meeting_date: '',
            summary: '',
            next_steps: '',
          })
          loadData()
        })
        .catch(() => {})
      return
    }

    handleCreate()
  }

  const handleDelete = (id) => {
    oneOnOnesAPI
      .delete(id)
      .then(() => loadData())
      .catch(() => {})
  }

  const filtered = useMemo(
    () =>
      oneOnOnes.filter((item) =>
        (item.collaborator_name || '').toLowerCase().includes(filter.toLowerCase()),
      ),
    [filter, oneOnOnes],
  )

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>CRUD de 1:1</Typography>
          <Typography color="text.secondary">Cadastro, edição, histórico, sentimento e próximos passos.</Typography>
        </Box>
        <Button variant="contained" onClick={() => setOpen(true)}>+ Nova 1:1</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 1 }}>
        <TextField
          label="Buscar por colaborador"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ minWidth: 280 }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 1, overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Colaborador</TableCell>
              <TableCell>Mood</TableCell>
              <TableCell>Sinal</TableCell>
              <TableCell>Próxima conversa</TableCell>
              <TableCell>Resumo</TableCell>
                <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.meeting_date}</TableCell>
                <TableCell>{item.collaborator_name}</TableCell>
                <TableCell>{item.mood_score}/10</TableCell>
                <TableCell>
                  <Chip
                    label={item.risk_signal || 'OK'}
                    color={item.risk_signal === 'ATENCAO' ? 'warning' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{item.next_meeting_date}</TableCell>
                <TableCell>{item.summary}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleOpenEdit(item)} sx={{ mr: 1 }}>
                    Editar
                  </Button>
                  <Button size="small" color="error" onClick={() => handleDelete(item.id)}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingId(null)
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editingId ? 'Editar 1:1' : 'Nova 1:1'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Colaborador"
              value={newOneOnOne.collaborator_id}
              onChange={(e) => setNewOneOnOne({ ...newOneOnOne, collaborator_id: e.target.value })}
            >
              {collaborators.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Data da conversa"
                type="date"
                value={newOneOnOne.meeting_date}
                onChange={(e) => setNewOneOnOne({ ...newOneOnOne, meeting_date: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Mood score"
                type="number"
                value={newOneOnOne.mood_score}
                onChange={(e) => setNewOneOnOne({ ...newOneOnOne, mood_score: e.target.value })}
                fullWidth
              />
              <TextField
                label="Próxima 1:1"
                type="date"
                value={newOneOnOne.next_meeting_date}
                onChange={(e) => setNewOneOnOne({ ...newOneOnOne, next_meeting_date: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <TextField
              label="Resumo da conversa"
              multiline
              minRows={4}
              value={newOneOnOne.summary}
              onChange={(e) => setNewOneOnOne({ ...newOneOnOne, summary: e.target.value })}
            />
            <TextField
              label="Próximos passos"
              multiline
              minRows={3}
              value={newOneOnOne.next_steps}
              onChange={(e) => setNewOneOnOne({ ...newOneOnOne, next_steps: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<Sparkles />}
            onClick={() => editingId && setAiDialogOpen(true)}
            disabled={!editingId}
          >
            Processar com IA
          </Button>
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
            {editingId ? 'Atualizar 1:1' : 'Salvar 1:1'}
          </Button>
        </DialogActions>
      </Dialog>

      <AIProcessingDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        oneOnOneId={editingId || 'new'}
        onSuccess={handleAISuccess}
      />
    </Container>
  )
}
