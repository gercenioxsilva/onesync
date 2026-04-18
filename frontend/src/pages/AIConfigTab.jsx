import React, { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CodeIcon from '@mui/icons-material/Code'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { aiAPI } from '../api/client'
import { useAuth } from '../auth/AuthProvider'

const DEFAULT_PROMPT = `Analyze this 1:1 meeting transcription between a manager and a team member.
Extract the following information in JSON format:
{
    "summary": "Executive summary of the conversation (max 500 chars)",
    "next_steps": "Action items agreed upon (max 500 chars)",
    "mood_score": mood as integer 1-10,
    "risk_signal": "RISCO, NEUTRO, or OPORTUNIDADE",
    "key_points": ["point1", "point2", ...]
}

Transcription:
{transcription}`

export default function AIConfigTab() {
  const { currentUser } = useAuth()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const canManage = ['OWNER', 'ADMIN'].includes(currentUser?.role)

  // Load AI config
  const loadConfig = () => {
    setLoading(true)
    setFeedback(null)
    aiAPI
      .getConfig()
      .then((res) => {
        setConfig(res.data)
        setEditForm(res.data)
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setConfig(null)
          setEditForm(null)
        } else {
          setFeedback({
            severity: 'error',
            message: err?.response?.data?.detail || 'Erro ao carregar configuração.',
          })
        }
      })
      .finally(() => setLoading(false))
  }

  // Load processing logs
  const loadLogs = () => {
    setLogsLoading(true)
    aiAPI
      .getLogs()
      .then((res) => setLogs(res.data))
      .catch(() => {})
      .finally(() => setLogsLoading(false))
  }

  useEffect(() => {
    loadConfig()
    loadLogs()
  }, [])

  // Save config
  const handleSave = async () => {
    setFeedback(null)
    setLoading(true)
    try {
      let res
      if (config) {
        res = await aiAPI.updateConfig({
          provider: editForm.provider,
          api_key: editForm.api_key,
          model_name: editForm.model_name,
          auto_process_enabled: editForm.auto_process_enabled,
          temperature: editForm.temperature,
          max_tokens: editForm.max_tokens,
          monthly_quota: editForm.monthly_quota,
          prompt_template: editForm.prompt_template,
        })
      } else {
        res = await aiAPI.createConfig({
          provider: editForm.provider,
          api_key: editForm.api_key,
          model_name: editForm.model_name,
          auto_process_enabled: editForm.auto_process_enabled,
          temperature: editForm.temperature,
          max_tokens: editForm.max_tokens,
          monthly_quota: editForm.monthly_quota,
          prompt_template: editForm.prompt_template,
        })
      }
      setConfig(res.data)
      setEditMode(false)
      setFeedback({ severity: 'success', message: 'Configuração de IA salva com sucesso!' })
    } catch (err) {
      setFeedback({
        severity: 'error',
        message: err?.response?.data?.detail || 'Erro ao salvar configuração.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {/* ──────────── Configuration ──────────── */}
      {loading && !config && <CircularProgress />}

      {!editMode && config && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Configuração de IA</Typography>
            {canManage && (
              <Button startIcon={<EditIcon />} size="small" onClick={() => setEditMode(true)}>
                Editar
              </Button>
            )}
          </Box>

          <Stack spacing={1.5}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 2, alignItems: 'start' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Provider</Typography>
              <Chip label={config.provider?.toUpperCase()} color="primary" variant="outlined" size="small" />

              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Modelo</Typography>
              <Typography variant="body2">{config.model_name}</Typography>

              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Temperatura</Typography>
              <Typography variant="body2">{config.temperature}</Typography>

              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Max Tokens</Typography>
              <Typography variant="body2">{config.max_tokens}</Typography>

              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Processa Automático</Typography>
              <Chip
                label={config.auto_process_enabled ? 'Ativado' : 'Desativado'}
                color={config.auto_process_enabled ? 'success' : 'default'}
                size="small"
                variant="outlined"
              />

              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Cota Mensal</Typography>
              <Typography variant="body2">
                {config.monthly_usage} / {config.monthly_quota} processamentos
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>API Key</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{config.api_key_masked}</Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {!editMode && !config && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 1, textAlign: 'center' }}>
          <Box sx={{ mb: 2 }}>
            <LightbulbIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
          </Box>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Nenhuma configuração de IA encontrada
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure uma IA para começar a processar suas 1:1s automaticamente.
          </Typography>
          {canManage && (
            <Button variant="contained" onClick={() => { setEditForm({}); setEditMode(true) }}>
              Configurar IA
            </Button>
          )}
        </Paper>
      )}

      {/* ──────────── Edit Form ──────────── */}
      {editMode && canManage && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Configurar IA</Typography>

          <Stack spacing={2}>
            <TextField
              select
              label="Provider"
              value={editForm?.provider || 'openai'}
              onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
              fullWidth
            >
              <MenuItem value="openai">OpenAI (Chat GPT)</MenuItem>
              <MenuItem value="gemini">Google Gemini</MenuItem>
            </TextField>

            <TextField
              label="API Key"
              type="password"
              value={editForm?.api_key || ''}
              onChange={(e) => setEditForm({ ...editForm, api_key: e.target.value })}
              placeholder="sk-... ou gsk_..."
              helperText="Sua API key será armazenada de forma segura"
              fullWidth
            />

            <TextField
              label="Modelo"
              value={editForm?.model_name || 'gpt-4-turbo'}
              onChange={(e) => setEditForm({ ...editForm, model_name: e.target.value })}
              helperText="Ex: gpt-4-turbo, gemini-1.5-flash"
              fullWidth
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Temperatura (0-1)"
                type="number"
                inputProps={{ step: 0.1, min: 0, max: 1 }}
                value={editForm?.temperature || 0.7}
                onChange={(e) => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })}
              />

              <TextField
                label="Max Tokens"
                type="number"
                value={editForm?.max_tokens || 1000}
                onChange={(e) => setEditForm({ ...editForm, max_tokens: parseInt(e.target.value) })}
              />

              <TextField
                label="Cota Mensal"
                type="number"
                value={editForm?.monthly_quota || 10}
                onChange={(e) => setEditForm({ ...editForm, monthly_quota: parseInt(e.target.value) })}
                helperText="0 = ilimitado"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={editForm?.auto_process_enabled || false}
                  onChange={(e) => setEditForm({ ...editForm, auto_process_enabled: e.target.checked })}
                />
              }
              label="Ativar processamento automático (beta)"
            />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Prompt Customizado</Typography>
                <Button
                  size="small"
                  startIcon={<CodeIcon />}
                  onClick={() => setPromptDialogOpen(true)}
                >
                  Editar Template
                </Button>
              </Box>
              <TextField
                disabled
                multiline
                rows={4}
                value={editForm?.prompt_template || DEFAULT_PROMPT}
                fullWidth
                size="small"
              />
            </Box>

            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button onClick={() => { setEditMode(false); setFeedback(null) }}>
                Cancelar
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      {/* ──────────── Processing Logs ──────────── */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Histórico de Processamentos
      </Typography>

      {logsLoading && <CircularProgress />}

      {!logsLoading && logs.length === 0 && (
        <Typography color="text.secondary">Nenhum processamento realizado ainda.</Typography>
      )}

      {!logsLoading && logs.length > 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell>Data</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell align="right">Tokens</TableCell>
                <TableCell align="right">Custo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(log.created_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {log.status === 'completed' && (
                        <>
                          <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                          <Typography variant="caption">Concluído</Typography>
                        </>
                      )}
                      {log.status === 'failed' && (
                        <>
                          <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                          <Typography variant="caption">Erro</Typography>
                        </>
                      )}
                      {log.status === 'processing' && (
                        <>
                          <CircularProgress size={16} />
                          <Typography variant="caption">Processando</Typography>
                        </>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{log.model_used}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">
                      {log.input_tokens} / {log.output_tokens}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">${log.estimated_cost.toFixed(4)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ──────────── Prompt Template Dialog ──────────── */}
      <Dialog open={promptDialogOpen} onClose={() => setPromptDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Template de Prompt</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            multiline
            rows={12}
            value={editForm?.prompt_template || DEFAULT_PROMPT}
            onChange={(e) => setEditForm({ ...editForm, prompt_template: e.target.value })}
            fullWidth
            helperText="Use {transcription} para indica onde a transcrição será inserida"
          />
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
              Variáveis disponíveis:
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              {'{transcription}'} - A transcrição do meeting
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => setPromptDialogOpen(false)}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
