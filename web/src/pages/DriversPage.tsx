import { Box, Button, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { driverApi } from '../api/endpoints'
import { AuthImage } from '../components/AuthImage'
import { EmptyState, formatDate, Mono, PageHeader, StatusChip } from '../components/common'
import { Plate } from '../components/Plate'

export function DriversPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const status = params.get('status') ?? ''
  const page = Number(params.get('page') ?? 0)

  const update = (next: Record<string, string>) => {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    setParams(p, { replace: true })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', params.toString()],
    queryFn: () => driverApi.search({ q: params.get('q') ?? undefined, status, page, size: 20 }),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title={t('nav.drivers')}
        subtitle="Search by name, driver code, NID or mobile number."
        actions={<Button variant="contained" onClick={() => navigate('/drivers/new')}>{t('action.registerDriver')}</Button>}
      />
      <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }} onSubmit={(e) => { e.preventDefault(); update({ q: q.trim(), page: '' }) }}>
        <TextField label="Search drivers" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. DRV-2026-000012 or 01712345678" />
        <TextField select label="Status" value={status} onChange={(e) => update({ status: e.target.value, page: '' })} sx={{ minWidth: 160, width: { sm: 200 } }}>
          <MenuItem value="">Any status</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="SUSPENDED">Suspended</MenuItem>
          <MenuItem value="BLACKLISTED">Blacklisted</MenuItem>
        </TextField>
        <Button type="submit" variant="outlined" sx={{ flexShrink: 0 }}>Search</Button>
      </Stack>
      <Paper>
        {data && data.totalElements === 0 ? (
          <EmptyState title="No drivers found">
            <Typography color="text.secondary">Try a different search, or register a new driver.</Typography>
          </EmptyState>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Driver</TableCell>
                  <TableCell>Driver code</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>NID</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Mobile</TableCell>
                  <TableCell>Drives</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Registered</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7}>Loading drivers…</TableCell></TableRow>}
                {data?.content.map((d) => (
                  <TableRow key={d.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/drivers/${d.id}`)}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <AuthImage id={d.photoId} alt="" size={36} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.fullName}</Typography>
                          <Typography variant="caption" color="text.secondary">s/o {d.fatherName}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell><Mono>{d.driverCode}</Mono></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Mono>{d.nid}</Mono></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Mono>{d.mobile}</Mono></TableCell>
                    <TableCell>{d.currentRickshaw ? <Plate number={d.currentRickshaw.rickshawNumber} size="sm" /> : <Typography variant="caption" color="text.secondary">None</Typography>}</TableCell>
                    <TableCell><StatusChip status={d.status} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{formatDate(d.registeredAt)}</TableCell>
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
