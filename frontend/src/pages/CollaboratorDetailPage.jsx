import React, { useEffect, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useParams } from 'react-router-dom'
import { actionsAPI, collaboratorsAPI, oneOnOnesAPI, pdisAPI } from '../api/client'

export default function CollaboratorDetailPage() {
  const { id } = useParams()
  const [collaborator, setCollaborator] = useState(null)
  const [oneOnOnes, setOneOnOnes] = useState([])
  const [pdi, setPdi] = useState(null)
  const [actions, setActions] = useState([])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadData = () => {
    if (!id) {
      setCollaborator(null)
      setOneOnOnes([])
      setPdi(null)
      setActions([])
      return
    }
    const collaboratorId = id

    // Load collaborator
    collaboratorsAPI
      .get(collaboratorId)
      .then((res) => setCollaborator(res.data))
      .catch(() => setCollaborator(null))

    // Load one-on-ones for this collaborator
    oneOnOnesAPI
      .listByCollaborator(collaboratorId)
      .then((res) => setOneOnOnes(res.data))
      .catch(() => setOneOnOnes([]))

    // Load PDI for this collaborator
    pdisAPI
      .listByCollaborator(collaboratorId)
      .then((res) => setPdi(res.data[0]))
      .catch(() => setPdi(null))

    actionsAPI
      .list()
      .then((res) =>
        setActions(
          res.data.filter(
            (item) => item.collaborator_id === collaboratorId && item.status !== 'CONCLUIDO'
          )
        )
      )
      .catch(() => setActions([]))
  }

  if (!collaborator) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>Carregando...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Avatar
              sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 24, fontWeight: 700 }}
            >
              {collaborator.name?.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {collaborator.name}
              </Typography>
              <Typography color="text.secondary">
                {collaborator.role} • {collaborator.city}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  label={collaborator.risk}
                  color={
                    collaborator.risk === 'ALTO'
                      ? 'error'
                      : collaborator.risk === 'MEDIO'
                        ? 'warning'
                        : 'success'
                  }
                  size="small"
                />
                <Chip
                  label={collaborator.pdi_status}
                  color="info"
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined">Editar perfil</Button>
            <Button variant="outlined">Registrar 1:1</Button>
            <Button variant="contained">Atualizar PDI</Button>
          </Stack>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>
            <Paper sx={{ p: 3, borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Resumo profissional
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography color="text.secondary">Foco atual</Typography>
                  <Typography>{collaborator.focus}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography color="text.secondary">Próxima 1:1</Typography>
                  <Typography>{collaborator.next_one_on_one}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography color="text.secondary">Objetivo de carreira</Typography>
                  <Typography>
                    Ampliar impacto técnico e capacidade de liderança informal no time.
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Histórico recente de 1:1
              </Typography>
              <Stack spacing={2}>
                {oneOnOnes.map((item) => (
                  <Box
                    key={item.id}
                    sx={{ borderLeft: '4px solid', borderColor: 'primary.main', pl: 2 }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>{item.meeting_date}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mood: {item.mood_score}/10 • Próxima: {item.next_meeting_date}
                    </Typography>
                    <Typography sx={{ mt: 1 }}>{item.summary}</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong>Próximo passo:</strong> {item.next_steps}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <Paper sx={{ p: 3, borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                PDI atual
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>{pdi?.cycle}</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {pdi?.objective}
              </Typography>
              <Typography variant="body2">Progresso geral</Typography>
              <LinearProgress
                variant="determinate"
                value={pdi?.progress ?? 0}
                sx={{ height: 10, borderRadius: 999, my: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {pdi?.progress ?? 0}% concluído
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                {pdi?.goals?.map((goal) => (
                  <Typography key={goal} variant="body2">
                    • {goal}
                  </Typography>
                ))}
              </Stack>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Ações abertas
              </Typography>
              <Stack spacing={1.5}>
                {actions.map((action) => (
                  <Box
                    key={action.id}
                    sx={{
                      p: 1.5,
                      bgcolor: '#f8fafc',
                      borderRadius: 1,
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <Typography sx={{ fontWeight: 600 }}>{action.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.category} • {action.owner} • {action.dueDate}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  )
}
