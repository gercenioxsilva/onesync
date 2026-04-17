import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { actionsAPI, collaboratorsAPI } from '../api/client'

const CATEGORIES = ['PDI', '1:1', 'Retenção', 'Feedback', 'Técnico', 'Outro']

const EMPTY_FORM = {
  title: '',
  owner: '',
  due_date: '',
  category: '',
  status: 'NAO_INICIADO',
  collaborator_id: '',
}

const STATUS_COLUMNS = [
  { key: 'NAO_INICIADO', title: 'Não iniciado' },
  { key: 'EM_ANDAMENTO', title: 'Em andamento' },
  { key: 'CONCLUIDO', title: 'Concluído' },
]

// Card component with drag/sortable support
function ActionCard({ item, onDelete, onMove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        p: 2,
        borderRadius: 1,
        border: '1px solid #e5e7eb',
        bgcolor: isDragging ? '#f0f0f0' : '#f8fafc',
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        userSelect: 'none',
      }}
    >
      <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ my: 0.5 }}>
        {[item.owner, item.due_date].filter(Boolean).join(' • ')}
      </Typography>
      {item.category ? (
        <Chip label={item.category} size="small" variant="outlined" />
      ) : null}
      <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}>
          Excluir
        </Button>
      </Box>
    </Box>
  )
}

// Column component with drop zone
function ActionColumn({ column, actions, onDelete }) {
  const { setNodeRef } = useSortable({
    id: column.key,
    data: { type: 'Column' },
  })

  const columnActions = actions.filter((item) => item.status === column.key)

  return (
    <Paper
      ref={setNodeRef}
      sx={{ p: 2.5, borderRadius: 1, minHeight: 360, bgcolor: '#fafafa' }}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        {column.title}
      </Typography>
      <SortableContext
        items={columnActions.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack spacing={1.5}>
          {columnActions.map((item) => (
            <ActionCard key={item.id} item={item} onDelete={onDelete} />
          ))}
        </Stack>
      </SortableContext>
    </Paper>
  )
}

export default function ActionsPage() {
  const [actions, setActions] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    loadActions()
    collaboratorsAPI.list().then((res) => setCollaborators(res.data)).catch(() => {})
  }, [])

  const loadActions = () => {
    actionsAPI
      .list()
      .then((res) => setActions(res.data))
      .catch(() => setActions([]))
  }

  const handleOpenDialog = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setFormError('')
  }

  const handleFormChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('O título é obrigatório.')
      return
    }
    setSaving(true)
    try {
      await actionsAPI.create({
        title: form.title.trim(),
        owner: form.owner.trim(),
        due_date: form.due_date,
        category: form.category,
        status: form.status,
        collaborator_id: form.collaborator_id || null,
      })
      setDialogOpen(false)
      loadActions()
    } catch {
      setFormError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id) => {
    actionsAPI
      .delete(id)
      .then(() => loadActions())
      .catch(() => setActions((current) => current.filter((item) => item.id !== id)))
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const activeItem = actions.find((a) => a.id === active.id)
    if (!activeItem) return

    // Check if we're over a column (has type: 'Column')
    const overColumnKey = STATUS_COLUMNS.find((col) => col.key === over.id)?.key
    if (overColumnKey && activeItem.status !== overColumnKey) {
      // Optimistic update
      setActions((current) =>
        current.map((item) =>
          item.id === active.id ? { ...item, status: overColumnKey } : item,
        ),
      )
      // Save to backend
      actionsAPI.updateStatus(active.id, overColumnKey).catch(() => loadActions())
    }
  }

  const handleDragEnd = () => {
    setActiveId(null)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Ações e checkpoints</Typography>
          <Typography color="text.secondary">Backlog gerencial com responsáveis, prazos e status.</Typography>
        </Box>
        <Button variant="contained" onClick={handleOpenDialog}>+ Nova ação</Button>
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Grid container spacing={3}>
          {STATUS_COLUMNS.map((column) => (
            <Grid item xs={12} md={4} key={column.key}>
              <ActionColumn column={column} actions={actions} onDelete={handleDelete} />
            </Grid>
          ))}
        </Grid>
        <DragOverlay>
          {activeId && actions.find((a) => a.id === activeId)
            ? (() => {
              const item = actions.find((a) => a.id === activeId)
              return (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    border: '1px solid #e5e7eb',
                    bgcolor: '#fff',
                    boxShadow: 3,
                    zIndex: 1000,
                  }}
                >
                  <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
                </Box>
              )
            })()
            : null}
        </DragOverlay>
      </DndContext>

      {/* Nova ação dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Nova ação</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Título *"
              value={form.title}
              onChange={handleFormChange('title')}
              fullWidth
              autoFocus
              error={!!formError && !form.title.trim()}
            />
            <TextField
              label="Responsável"
              value={form.owner}
              onChange={handleFormChange('owner')}
              fullWidth
            />
            <TextField
              label="Prazo"
              type="date"
              value={form.due_date}
              onChange={handleFormChange('due_date')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select value={form.category} label="Categoria" onChange={handleFormChange('category')}>
                <MenuItem value="">Sem categoria</MenuItem>
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status inicial</InputLabel>
              <Select value={form.status} label="Status inicial" onChange={handleFormChange('status')}>
                {STATUS_COLUMNS.map((col) => (
                  <MenuItem key={col.key} value={col.key}>{col.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {collaborators.length > 0 && (
              <FormControl fullWidth>
                <InputLabel>Colaborador (opcional)</InputLabel>
                <Select
                  value={form.collaborator_id}
                  label="Colaborador (opcional)"
                  onChange={handleFormChange('collaborator_id')}
                >
                  <MenuItem value="">Nenhum</MenuItem>
                  {collaborators.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {formError && (
              <Typography color="error" variant="body2">{formError}</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
