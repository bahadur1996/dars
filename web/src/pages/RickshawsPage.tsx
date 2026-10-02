import { Autocomplete, Box, Button, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { rickshawApi } from '../api/endpoints'
import { AuthImage } from '../components/AuthImage'
import { EmptyState, formatDate, Mono, PageHeader, StatusChip } from '../components/common'
import { DHAKA_THANAS } from '../components/forms'
import { Plate } from '../components/Plate'

export function RickshawsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const get = (k: string) => params.get(k) ?? ''
  const page = Number(params.get('page') ?? 0)

  const update = (next: Record<string, string>) => {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    if (!('page' in next)) p.delete('page')
    setParams(p, { replace: true })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['rickshaws', params.toString()],
    queryFn: () => rickshawApi.search({ q: get('q'), thana: get('thana'), status: get('status'), from: get('from'), to: get('to'), page, size: 20 }),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title={t('nav.rickshaws')}
        subtitle="Find a rickshaw by its number, or by its driver's code, NID or mobile."
        actions={<Button variant="contained" onClick={() => navigate('/rickshaws/new')}>{t('action.registerRickshaw')}</Button>}
      />
      <Box component="form" onSubmit={(e) => { e.preventDefault(); update({ q: q.trim() }) }} sx={{ display: 'grid', gap: 1.5, mb: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '2fr 1fr 1fr 1fr 1fr auto' } }}>
        <TextField label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="DHK-AR-000123, DRV-…, NID or mobile" />
        <Autocomplete freeSolo options={DHAKA_THANAS} value={get('thana') || null} onChange={(_, v) => update({ thana: v ?? '' })} renderInput={(p) => <TextField {...p} label="Thana" />} />
        <TextField select label="Status" value={get('status')} onChange={(e) => update({ status: e.target.value })}>
          <MenuItem value="">Any status</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="SUSPENDED">Suspended</MenuItem>
          <MenuItem value="IMPOUNDED">Impounded</MenuItem>
        </TextField>
        <TextField type="date" label="Registered from" value={get('from')} onChange={(e) => update({ from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label="Registered to" value={get('to')} onChange={(e) => update({ to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <Button type="submit" variant="outlined">Search</Button>
      </Box>
      <Paper>
        {data && data.totalElements === 0 ? (
          <EmptyState title="No rickshaws found">
            <Typography color="text.secondary">Clear some filters, or register a new rickshaw.</Typography>
          </EmptyState>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Number</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Photo</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Owner</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Thana</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Registered</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7}>Loading rickshaws…</TableCell></TableRow>}
                {data?.content.map((r) => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/rickshaws/${r.id}`)}>
                    <TableCell><Plate number={r.rickshawNumber} size="sm" /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><AuthImage id={r.photoId} alt="" size={56} ratio={4 / 3} /></TableCell>
                    <TableCell>
                      {r.currentDriver ? (
                        <>
                          <Typography variant="body2">{r.currentDriver.fullName}</Typography>
                          <Typography variant="caption" color="text.secondary"><Mono>{r.currentDriver.driverCode}</Mono></Typography>
                        </>
                      ) : <Typography variant="caption" color="text.secondary">No driver</Typography>}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{r.owner.fullName}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{r.thana}</TableCell>
                    <TableCell><StatusChip status={r.status} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Stack>
                        <span>{formatDate(r.registeredAt)}</span>
                        <Typography variant="caption" color="text.secondary">{r.registeredBy.fullName}</Typography>
                      </Stack>
                    </TableCell>
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
