import { Box, Button, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { complaintApi } from '../api/endpoints'
import { EmptyState, formatDate, Mono, PageHeader, StatusChip } from '../components/common'
import { Plate } from '../components/Plate'
import { CATEGORY_LABEL } from '../components/Records'

const TEXT_FILTERS = ['rickshawNumber', 'driverCode', 'complainant'] as const

/** Complaints filed by the public (FR-14, FR-16). Officers resolve, reject or escalate them. */
export function ComplaintsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''
  const [text, setText] = useState(() => Object.fromEntries(TEXT_FILTERS.map((k) => [k, get(k)])))
  const page = Number(params.get('page') ?? 0)

  const update = (next: Record<string, string>) => {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    if (!('page' in next)) p.delete('page')
    setParams(p, { replace: true })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', params.toString()],
    queryFn: () => complaintApi.search({
      status: get('status'), rickshawNumber: get('rickshawNumber'), driverCode: get('driverCode'),
      complainant: get('complainant'), from: get('from'), to: get('to'), page, size: 20,
    }),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader title={t('nav.complaints')} subtitle="Complaints from the public about a rickshaw and its driver." />
      <Box
        component="form"
        onSubmit={(e) => { e.preventDefault(); update(Object.fromEntries(TEXT_FILTERS.map((k) => [k, text[k].trim()]))) }}
        sx={{ display: 'grid', gap: 1.5, mb: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(6, 1fr) auto' } }}
      >
        <TextField select label="Status" value={get('status')} onChange={(e) => update({ status: e.target.value })}>
          <MenuItem value="">Any status</MenuItem>
          <MenuItem value="OPEN">Open</MenuItem>
          <MenuItem value="RESOLVED">Resolved</MenuItem>
          <MenuItem value="REJECTED">Rejected</MenuItem>
          <MenuItem value="ESCALATED">Escalated</MenuItem>
        </TextField>
        <TextField label="Rickshaw number" value={text.rickshawNumber} onChange={(e) => setText({ ...text, rickshawNumber: e.target.value })} />
        <TextField label="Driver code" value={text.driverCode} onChange={(e) => setText({ ...text, driverCode: e.target.value })} />
        <TextField label="Complainant phone or NID" value={text.complainant} onChange={(e) => setText({ ...text, complainant: e.target.value })} />
        <TextField type="date" label="Filed from" value={get('from')} onChange={(e) => update({ from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label="Filed to" value={get('to')} onChange={(e) => update({ to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <Button type="submit" variant="outlined">Search</Button>
      </Box>
      <Paper>
        {data && data.totalElements === 0 ? (
          <EmptyState title="No complaints found">
            <Typography color="text.secondary">Clear some filters to see more.</Typography>
          </EmptyState>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Complaint</TableCell>
                  <TableCell>Rickshaw</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Driver</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Category</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Complainant</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Filed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7}>Loading complaints…</TableCell></TableRow>}
                {data?.content.map((c) => (
                  <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/complaints/${c.id}`)}>
                    <TableCell><Mono>{c.complaintNo}</Mono></TableCell>
                    <TableCell><Plate number={c.rickshaw.rickshawNumber} size="sm" /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Stack>
                        <Typography variant="body2">{c.driver.fullName}</Typography>
                        <Typography variant="caption" color="text.secondary"><Mono>{c.driver.driverCode}</Mono></Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{CATEGORY_LABEL[c.category]}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Stack>
                        <Typography variant="body2">{c.complainantName}</Typography>
                        <Typography variant="caption" color="text.secondary"><Mono>{c.complainantPhone}</Mono></Typography>
                      </Stack>
                    </TableCell>
                    <TableCell><StatusChip status={c.status} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatDate(c.filedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {data && data.totalElements > 0 && (
          <TablePagination component="div" count={data.totalElements} page={page} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_, p) => update({ page: String(p) })} />
        )}
      </Paper>
    </>
  )
}
