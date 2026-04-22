import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { okrsAPI } from '../api/client'

const CYCLES = ['2026_H1', '2026_H2', '2027_H1', '2027_H2']

const METRIC_TYPES = [
  { value: 'PERCENT', label: 'Percentual (%)' },
  { value: 'NUMBER', label: 'Número' },
  { value: 'CURRENCY', label: 'Moeda (R$)' },
]

const STATUS_COLORS = {
  CONCLUIDO: '#22c55e',
  NO_PRAZO: '#3b82f6',
  EM_RISCO: '#f59e0b',
  ATRASADO: '#ef4444',
  SEM_KRS: '#94a3b8',
}

const STATUS_LABELS = {
  CONCLUIDO: 'Concluído',
  NO_PRAZO: 'No prazo',
  EM_RISCO: 'Em risco',
  ATRASADO: 'Atrasado',
  SEM_KRS: 'Sem KRs',
}

const EMPTY_OBJ_FORM = { title: '', description: '', cycle: '2026_H1', collaborator_id: '' }
const EMPTY_KR_FORM = {
  title: '',
  metric_type: 'PERCENT',
  unit: '',
  initial_value: 0,
  target_value: 100,
  current_value: 0,
}

function StatusChip({ status }) {
  return (
    <Chip
      label={STATUS_LABELS[status] || status}
      size="small"
      sx={{
        bgcolor: STATUS_COLORS[status] || '#94a3b8',
        color: 'white',
        fontWeight: 700,
        fontSize: 11,
      }}
    />
  )
}

function ProgressBar({ value, status }) {
  const color = STATUS_COLORS[status] || '#94a3b8'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ flexGrow: 1 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(value, 100)}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: '#e2e8f0',
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
          }}
        />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, color, minWidth: 36 }}>
        {value}%
      </Typography>
    </Box>
  )
}

function KeyResultRow({ kr, onProgressChange, onDelete, writeable }) {
  const [localValue, setLocalValue] = useState(kr.current_value)
  const [saving, setSaving] = useState(false)

  const handleCommit = async (value) => {
    if (value === kr.current_value) return
    setSaving(true)
    try {
      await onProgressChange(kr.id, value)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ py: 1.5, px: 2, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #e2e8f0' }}>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
            {kr.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {kr.initial_value} → {kr.target_value} {kr.unit} ·{' '}
            {METRIC_TYPES.find((m) => m.value === kr.metric_type)?.label || kr.metric_type}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatusChip status={kr.status} />
          {writeable && (
            <Tooltip title="Remover KR">
              <IconButton
                size="small"
                color="error"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onDelete(kr.id)}
              >
                ✕
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      <ProgressBar value={kr.progress_pct} status={kr.status} />
      {writeable && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Valor atual: {localValue} {kr.unit}
          </Typography>
          <Slider
            value={localValue}
            min={kr.initial_value}
            max={kr.target_value}
            step={(kr.target_value - kr.initial_value) / 100 || 1}
            onChange={(_, v) => setLocalValue(v)}
            onChangeCommitted={(_, v) => handleCommit(v)}
            disabled={saving}
            size="small"
            sx={{ mt: 0.5 }}
          />
        </Box>
      )}
    </Box>
  )
}

function ObjectiveCard({ objective, onRefresh, writeable }) {
  const [expanded, setExpanded] = useState(false)
  const [addKrOpen, setAddKrOpen] = useState(false)
  const [krForm, setKrForm] = useState(EMPTY_KR_FORM)
  const [krError, setKrError] = useState('')
  const [savingKr, setSavingKr] = useState(false)

  const handleAddKr = async () => {
    if (!krForm.title.trim()) {
      setKrError('Título obrigatório')
      return
    }
    if (Number(krForm.target_value) === Number(krForm.initial_value)) {
      setKrError('Valor alvo deve ser diferente do valor inicial')
      return
    }
    setSavingKr(true)
    try {
      await okrsAPI.addKeyResult(objective.id, {
        ...krForm,
        initial_value: Number(krForm.initial_value),
        target_value: Number(krForm.target_value),
        current_value: Number(krForm.current_value),
      })
      setAddKrOpen(false)
      setKrForm(EMPTY_KR_FORM)
      setKrError('')
      onRefresh()
    } catch {
      setKrError('Erro ao salvar KR.')
    } finally {
      setSavingKr(false)
    }
  }

  const handleProgressChange = async (krId, value) => {
    await okrsAPI.updateKrProgress(krId, value)
    onRefresh()
  }

  const handleDeleteKr = async (krId) => {
    await okrsAPI.deleteKeyResult(krId)
    onRefresh()
  }

  const handleDeleteObjective = async () => {
    await okrsAPI.deleteObjective(objective.id)
    onRefresh()
  }

  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e2e8f0' }} elevation={0}>
      <Box
        sx={{
          p: 2.5,
          cursor: 'pointer',
          bgcolor: 'white',
          '&:hover': { bgcolor: '#f8fafc' },
          transition: 'background .15s',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1.5,
          }}
        >
          <Box sx={{ flexGrow: 1, pr: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {objective.title}
              </Typography>
              <Chip label={objective.cycle} size="small" variant="outlined" sx={{ fontSize: 10 }} />
            </Box>
            {objective.description && (
              <Typography variant="body2" color="text.secondary">
                {objective.description}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <StatusChip status={objective.status} />
            <Typography variant="caption" color="text.secondary">
              {objective.key_results.length} KR{objective.key_results.length !== 1 ? 's' : ''}
            </Typography>
            {writeable && (
              <Tooltip title="Excluir objetivo">
                <IconButton
                  size="small"
                  color="error"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteObjective()
                  }}
                >
                  ✕
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
        <ProgressBar value={objective.progress_pct} status={objective.status} />
      </Box>

      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 2.5, bgcolor: '#fafafa' }}>
          <Stack spacing={1.5}>
            {objective.key_results.length === 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 1 }}
              >
                Nenhum Key Result cadastrado ainda.
              </Typography>
            )}
            {objective.key_results.map((kr) => (
              <KeyResultRow
                key={kr.id}
                kr={kr}
                onProgressChange={handleProgressChange}
                onDelete={handleDeleteKr}
                writeable={writeable}
              />
            ))}
            {writeable && (
              <Button
                variant="outlined"
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  setAddKrOpen(true)
                }}
                sx={{ alignSelf: 'flex-start', mt: 0.5 }}
              >
                + Key Result
              </Button>
            )}
          </Stack>
        </Box>
      </Collapse>

      <Dialog open={addKrOpen} onClose={() => setAddKrOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Key Result</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Título *"
              value={krForm.title}
              onChange={(e) => setKrForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
              autoFocus
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de métrica</InputLabel>
              <Select
                value={krForm.metric_type}
                label="Tipo de métrica"
                onChange={(e) => setKrForm((f) => ({ ...f, metric_type: e.target.value }))}
              >
                {METRIC_TYPES.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Unidade (ex: pontos, %, R$)"
              value={krForm.unit}
              onChange={(e) => setKrForm((f) => ({ ...f, unit: e.target.value }))}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Valor inicial"
                type="number"
                value={krForm.initial_value}
                onChange={(e) => setKrForm((f) => ({ ...f, initial_value: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Valor alvo *"
                type="number"
                value={krForm.target_value}
                onChange={(e) => setKrForm((f) => ({ ...f, target_value: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Valor atual"
                type="number"
                value={krForm.current_value}
                onChange={(e) => setKrForm((f) => ({ ...f, current_value: e.target.value }))}
                fullWidth
              />
            </Stack>
            {krError && <Alert severity="error">{krError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddKrOpen(false)} disabled={savingKr}>
            Cancelar
          </Button>
          <Button onClick={handleAddKr} variant="contained" disabled={savingKr}>
            {savingKr ? 'Salvando...' : 'Adicionar KR'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

export default function OKRsPage() {
  const [objectives, setObjectives] = useState([])
  const [cycle, setCycle] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_OBJ_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const writeable = true

  const load = () => {
    setLoading(true)
    okrsAPI
      .list(cycle || undefined)
      .then((res) => setObjectives(res.data))
      .catch(() => setObjectives([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [cycle]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('Título obrigatório')
      return
    }
    setSaving(true)
    try {
      await okrsAPI.create({
        title: form.title.trim(),
        description: form.description.trim(),
        cycle: form.cycle,
        collaborator_id: form.collaborator_id || null,
      })
      setDialogOpen(false)
      setForm(EMPTY_OBJ_FORM)
      setFormError('')
      load()
    } catch {
      setFormError('Erro ao criar objetivo.')
    } finally {
      setSaving(false)
    }
  }

  const totalKrs = objectives.reduce((acc, o) => acc + o.key_results.length, 0)
  const avgProgress =
    objectives.length > 0
      ? Math.round(objectives.reduce((acc, o) => acc + o.progress_pct, 0) / objectives.length)
      : 0
  const atRisk = objectives.filter((o) => o.status === 'EM_RISCO' || o.status === 'ATRASADO').length

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            OKRs
          </Typography>
          <Typography color="text.secondary">
            Objetivos e Key Results da empresa por ciclo.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Ciclo</InputLabel>
            <Select value={cycle} label="Ciclo" onChange={(e) => setCycle(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {CYCLES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {writeable && (
            <Button variant="contained" onClick={() => setDialogOpen(true)}>
              + Novo objetivo
            </Button>
          )}
        </Box>
      </Box>

      {/* Sumário */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Objetivos', value: objectives.length },
          { label: 'Key Results', value: totalKrs },
          { label: 'Progresso médio', value: `${avgProgress}%` },
        ].map((s) => (
          <Paper key={s.label} sx={{ p: 2, borderRadius: 2, textAlign: 'center' }} elevation={0}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {s.value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {s.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {atRisk > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {atRisk} objetivo{atRisk > 1 ? 's' : ''} em risco ou atrasado{atRisk > 1 ? 's' : ''} —
          revise os Key Results.
        </Alert>
      )}

      {loading ? (
        <LinearProgress />
      ) : objectives.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }} elevation={0}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            Nenhum objetivo cadastrado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crie o primeiro objetivo e adicione Key Results para medir o progresso.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {objectives.map((obj) => (
            <ObjectiveCard key={obj.id} objective={obj} onRefresh={load} writeable={writeable} />
          ))}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Objetivo</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Título do objetivo *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              fullWidth
              autoFocus
              placeholder="Ex: Aumentar satisfação dos clientes"
            />
            <TextField
              label="Descrição"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Ciclo</InputLabel>
              <Select
                value={form.cycle}
                label="Ciclo"
                onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value }))}
              >
                {CYCLES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {formError && <Alert severity="error">{formError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Criando...' : 'Criar objetivo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
