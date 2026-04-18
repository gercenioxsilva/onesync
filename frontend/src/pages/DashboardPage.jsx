import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { actionsAPI, collaboratorsAPI, reportingAPI } from '../api/client'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [riskBreakdown, setRiskBreakdown] = useState(null)
  const [teamPriorities, setTeamPriorities] = useState([])
  const [priorityActions, setPriorityActions] = useState([])

  const riskWeight = {
    ALTO: 3,
    MEDIO: 2,
    BAIXO: 1,
  }

  const formatDate = (value) => {
    if (!value) return '-'
    const datePart = String(value).includes('T') ? String(value).split('T')[0] : String(value)
    const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) {
      const [, year, month, day] = match
      return `${day}/${month}/${year}`
    }
    return String(value)
  }

  const formatStatus = (status) => (status ? String(status).replaceAll('_', ' ') : '-')

  const sortCollaboratorsByPriority = (items) => [...items].sort((a, b) => {
    const riskDiff = (riskWeight[b.risk] || 0) - (riskWeight[a.risk] || 0)
    if (riskDiff !== 0) return riskDiff

    const progressA = Number(a.progress || 0)
    const progressB = Number(b.progress || 0)
    if (progressA !== progressB) return progressA - progressB

    return String(a.name || '').localeCompare(String(b.name || ''))
  })

  const sortActionsByPriority = (items) => [...items]
    .filter((item) => item.status !== 'CONCLUIDO')
    .sort((a, b) => {
      const aHasDate = Boolean(a.due_date)
      const bHasDate = Boolean(b.due_date)
      if (aHasDate && bHasDate) return String(a.due_date).localeCompare(String(b.due_date))
      if (aHasDate) return -1
      if (bHasDate) return 1
      return String(a.title || '').localeCompare(String(b.title || ''))
    })

  useEffect(() => {
    Promise.all([
      reportingAPI.dashboard(),
      reportingAPI.riskBreakdown(),
      collaboratorsAPI.list(),
      actionsAPI.list(),
    ])
      .then(([dashRes, riskRes, collabRes, actionsRes]) => {
        setDashboard(dashRes.data)
        setRiskBreakdown(riskRes.data)
        setTeamPriorities(sortCollaboratorsByPriority(collabRes.data).slice(0, 6))
        setPriorityActions(sortActionsByPriority(actionsRes.data).slice(0, 5))
      })
      .catch(() => {
        setDashboard({
          total_collaborators: 0,
          high_risk_count: 0,
          pdi_in_progress: 0,
          total_one_on_ones: 0,
        })
        setRiskBreakdown({
          low: 0,
          medium: 0,
          high: 0,
        })
        setTeamPriorities([])
        setPriorityActions([])
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
            Dashboard executivo
          </Typography>
          <Typography color="text.secondary">
            Visão consolidada de saúde do time, progresso de PDI e cadência de 1:1.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined">Exportar CSV</Button>
          <Button
            variant="contained"
            onClick={() => navigate('/one-on-ones', { state: { openCreate: true } })}
          >
            Registrar 1:1
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 1 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Colaboradores
              </Typography>
              <Typography variant="h5">{dashboard?.total_collaborators ?? '-'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 1 }}>
            <CardContent>
              <Typography color="error" gutterBottom>
                Risco Alto
              </Typography>
              <Typography variant="h5">{dashboard?.high_risk_count ?? '-'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 1 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                PDIs em Progresso
              </Typography>
              <Typography variant="h5">{dashboard?.pdi_in_progress ?? '-'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 1 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                1:1s Registradas
              </Typography>
              <Typography variant="h5">{dashboard?.total_one_on_ones ?? '-'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, borderRadius: 1 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Prioridades do time
            </Typography>
            <Stack spacing={2}>
              {teamPriorities.map((item) => (
                <Box key={item.id} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 1, bgcolor: '#fafbff' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.role} • {item.focus}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Chip label={item.risk} color={item.risk === 'ALTO' ? 'error' : item.risk === 'MEDIO' ? 'warning' : 'success'} size="small" />
                      <Chip label={formatStatus(item.pdi_status)} variant="outlined" size="small" />
                    </Stack>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Próxima 1:1: {formatDate(item.next_one_on_one)} • Progresso PDI: {Number(item.progress || 0)}%
                  </Typography>
                </Box>
              ))}
              {teamPriorities.length === 0 && (
                <Typography variant="body2" color="text.secondary">Nenhuma prioridade encontrada.</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>
            <Paper sx={{ p: 3, borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Distribuição de Riscos
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                    <Typography variant="body2">Risco Baixo</Typography>
                    <Typography variant="h6">{riskBreakdown?.low ?? '-'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                    <Typography variant="body2">Risco Médio</Typography>
                    <Typography variant="h6">{riskBreakdown?.medium ?? '-'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 1 }}>
                    <Typography variant="body2">Risco Alto</Typography>
                    <Typography variant="h6">{riskBreakdown?.high ?? '-'}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 1 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Ações prioritárias
              </Typography>
              <Stack spacing={1.5}>
                {priorityActions.map((action, index) => (
                  <React.Fragment key={action.id}>
                    <Box>
                      <Typography sx={{ fontWeight: 600 }}>{action.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {action.owner || '-'} • {formatDate(action.due_date || action.dueDate)} • {formatStatus(action.status)}
                      </Typography>
                    </Box>
                    {index < priorityActions.length - 1 ? <Divider /> : null}
                  </React.Fragment>
                ))}
                {priorityActions.length === 0 && (
                  <Typography variant="body2" color="text.secondary">Nenhuma ação em aberto.</Typography>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  )
}
