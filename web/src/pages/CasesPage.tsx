import { Autocomplete, Box, Button, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { caseApi } from '../api/endpoints'
import { EmptyState, formatDate, Mono, PageHeader, StatusChip } from '../components/common'
import { DHAKA_THANAS } from '../components/forms'
import { Plate } from '../components/Plate'

/** Cases against rickshaws and drivers (FR-15, FR-16). */
export function CasesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const get = (k: string) => params.get(k) ?? ''
  const [rickshawNumber, setRickshawNumber] = useState(get('rickshawNumber'))
  const [driverCode, setDriverCode] = useState(get('driverCode'))
  const page = Number(params.get('page') ?? 0)

  const update = (next: Record<string, string>) => {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    if (!('page' in next)) p.delete('page')
    setParams(p, { replace: true })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['cases', params.toString()],
    queryFn: () => caseApi.search({
      status: get('status'), rickshawNumber: get('rickshawNumber'), driverCode: get('driverCode'),
      thana: get('thana'), from: get('from'), to: get('to'), page, size: 20,
    }),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title={t('nav.cases')}
        subtitle="Formal cases against a rickshaw, a driver, or both."
        actions={<Button variant="contained" onClick={() => navigate('/cases/new')}>{t('action.fileCase')}</Button>}
      />
      <Box
        component="form"
        onSubmit={(e) => { e.preventDefault(); update({ rickshawNumber: rickshawNumber.trim(), driverCode: driverCode.trim() }) }}
        sx={{ display: 'grid', gap: 1.5, mb: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(6, 1fr) auto' } }}
      >
        <TextField select label="Status" value={get('status')} onChange={(e) => update({ status: e.target.value })}>
          <MenuItem value="">Any status</MenuItem>
          <MenuItem value="OPEN">Open</MenuItem>
          <MenuItem value="UNDER_INVESTIGATION">Under investigation</MenuItem>
          <MenuItem value="CLOSED">Closed</MenuItem>
          <MenuItem value="DISMISSED">Dismissed</MenuItem>
        </TextField>
        <TextField label="Rickshaw number" value={rickshawNumber} onChange={(e) => setRickshawNumber(e.target.value)} />
        <TextField label="Driver code" value={driverCode} onChange={(e) => setDriverCode(e.target.value)} />
        <Autocomplete freeSolo options={DHAKA_THANAS} value={get('thana') || null} onChange={(_, v) => update({ thana: v ?? '' })} renderInput={(p) => <TextField {...p} label="Thana" />} />
        <TextField type="date" label="Filed from" value={get('from')} onChange={(e) => update({ from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label="Filed to" value={get('to')} onChange={(e) => update({ to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
        <Button type="submit" variant="outlined">Search</Button>
      </Box>
      <Paper>
        {data && data.totalElements === 0 ? (
          <EmptyState title="No cases found">
            <Typography color="text.secondary">Clear some filters, or file a new case.</Typography>
          </EmptyState>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Case</TableCell>
                  <TableCell>Offence</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Rickshaw</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Driver</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Filed</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={6}>Loading cases…</TableCell></TableRow>}
                {data?.content.map((c) => (
                  <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.id}`)}>
                    <TableCell><Mono>{c.caseNo}</Mono></TableCell>
                    <TableCell>{c.offence}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {c.rickshaw ? <Plate number={c.rickshaw.rickshawNumber} size="sm" /> : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {c.driver ? (
                        <Stack>
                          <Typography variant="body2">{c.driver.fullName}</Typography>
                          <Typography variant="caption" color="text.secondary"><Mono>{c.driver.driverCode}</Mono></Typography>
                        </Stack>
                      ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell><StatusChip status={c.status} /></TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Stack>
                        <span>{formatDate(c.filedAt)}</span>
                        <Typography variant="caption" color="text.secondary">{c.filedBy.fullName}</Typography>
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
