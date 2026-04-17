import React, { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { reportingAPI } from '../api/client'

export default function ReportsPage() {
  const [collaborators, setCollaborators] = useState([])
  const [insights, setInsights] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    // Load collaborators for heatmap
    reportingAPI
      .heatmap()
      .then((res) => setCollaborators(res.data))
      .catch(() => setCollaborators([]))

    // Load insights (default mock data since no specific endpoint)
    setInsights({
      interventionNeeded: 2,
      pdiWithoutCheckpoint: 4,
      oneOnOneOnTime: 90,
      pdiInitiated: 60,
      oneOnOneRate: 90,
      collabsInAttention: 10,
    })
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Relatórios
        </Typography>
        <Typography color="text.secondary">Heatmap de acompanhamento, KPIs e insights automáticos.</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, borderRadius: 1, overflow: 'hidden' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Heatmap do time
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Próxima 1:1</TableCell>
                  <TableCell>Progresso PDI</TableCell>
                  <TableCell>Risco</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {collaborators.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.next_one_on_one || '-'}</TableCell>
                    <TableCell>{item.progress}%</TableCell>
                    <TableCell>{item.risk}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 1 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                  Insights
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • {insights?.interventionNeeded || 2} pessoas exigem intervenção prioritária.
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • {insights?.pdiWithoutCheckpoint || 4} PDIs estão sem checkpoint recente.
                </Typography>
                <Typography variant="body2">
                  • {insights?.oneOnTimeOnTime || 90}% das 1:1 da semana ocorreram no prazo.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 1 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                  KPIs estratégicos
                </Typography>
                <Typography variant="body2">
                  Taxa de PDIs iniciados: {insights?.pdiInitiated || 60}%
                </Typography>
                <Typography variant="body2">Taxa de 1:1 em dia: {insights?.oneOnOneRate || 90}%</Typography>
                <Typography variant="body2">
                  Colaboradores em atenção: {insights?.collabsInAttention || 10}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  )
}
