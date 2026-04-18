import React, { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Paper,
} from '@mui/material'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import { aiAPI } from '../api/client'

export default function AIProcessingDialog({ open, onClose, oneOnOneId, onSuccess }) {
  const [transcription, setTranscription] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const handleProcess = async () => {
    if (!transcription.trim() || transcription.length < 10) {
      setError('A transcrição deve ter pelo menos 10 caracteres.')
      return
    }

    setError(null)
    setProcessing(true)

    try {
      const { data } = await aiAPI.processOneOnOne({
        one_on_one_id: oneOnOneId,
        transcription: transcription.trim(),
        input_type: 'transcription',
      })

      setResult(data)
      setFeedback({
        severity: 'success',
        message: `✨ 1:1 processada com sucesso! Custo: $${data.estimated_cost.toFixed(4)}`,
      })
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || 'Erro ao processar a 1:1 com IA.'
      setError(errorMsg)
      setFeedback({
        severity: 'error',
        message: errorMsg,
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirm = () => {
    if (result && onSuccess) {
      onSuccess(result)
    }
    handleClose()
  }

  const handleClose = () => {
    setTranscription('')
    setResult(null)
    setError(null)
    setFeedback(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
        <LightbulbIcon color="primary" />
        Processar com IA
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {!result ? (
          <Stack spacing={2}>
            {feedback && (
              <Alert severity={feedback.severity}>{feedback.message}</Alert>
            )}

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Cole a transcrição do meeting aqui:
              </Typography>
              <TextField
                multiline
                rows={8}
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                placeholder="Conversa entre gestor e liderado..."
                fullWidth
                disabled={processing}
                error={!!error}
                helperText={
                  error
                    ? error
                    : `${transcription.length} caracteres • Mínimo 10`
                }
              />
            </Box>

            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
                A IA irá extrair:
              </Typography>
              <Typography variant="caption" component="div">
                ✓ Resumo da conversa
              </Typography>
              <Typography variant="caption" component="div">
                ✓ Próximos passos
              </Typography>
              <Typography variant="caption" component="div">
                ✓ Sentimento (1-10)
              </Typography>
              <Typography variant="caption" component="div">
                ✓ Sinais de risco
              </Typography>
            </Box>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Alert severity="success">
              ✨ Dados extraídos com sucesso!
            </Alert>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Resumo:
              </Typography>
              <Paper sx={{ p: 1.5, bgcolor: '#f9f9f9' }}>
                <Typography variant="body2">
                  {result.extracted_summary}
                </Typography>
              </Paper>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Próximos passos:
              </Typography>
              <Paper sx={{ p: 1.5, bgcolor: '#f9f9f9' }}>
                <Typography variant="body2">
                  {result.extracted_next_steps}
                </Typography>
              </Paper>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Sentimento
                </Typography>
                <Typography variant="h6">
                  {result.extracted_mood_score}/10
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Sinal de Risco
                </Typography>
                <Chip
                  label={result.extracted_risk_signal}
                  color={
                    result.extracted_risk_signal === 'RISCO'
                      ? 'error'
                      : result.extracted_risk_signal === 'OPORTUNIDADE'
                      ? 'success'
                      : 'default'
                  }
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>

            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Tokens utilizados: {result.input_tokens} entrada + {result.output_tokens} saída
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                Custo estimado: ${result.estimated_cost.toFixed(4)}
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {result ? 'Fechar' : 'Cancelar'}
        </Button>

        {!result && (
          <Button
            variant="contained"
            onClick={handleProcess}
            disabled={processing || !transcription.trim() || transcription.length < 10}
            startIcon={processing && <CircularProgress size={16} />}
          >
            {processing ? 'Processando...' : 'Processar com IA'}
          </Button>
        )}

        {result && (
          <Button
            variant="contained"
            onClick={handleConfirm}
          >
            Confirmar e usar dados
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
