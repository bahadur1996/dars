import { MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField } from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { auditApi } from '../api/endpoints'
import { formatDateTime, Mono, PageHeader } from '../components/common'

const ENTITIES = ['RICKSHAW', 'DRIVER', 'OWNER', 'USER']

/** FR-10 audit log. Admin only. */
export function AuditPage() {
  const { t } = useTranslation()
  const [entity, setEntity] = useState('')
  const [page, setPage] = useState(0)
  const { data } = useQuery({ queryKey: ['audit', entity, page], queryFn: () => auditApi.list({ entity, page, size: 50 }), placeholderData: keepPreviousData })

  return (
    <>
      <PageHeader title={t('nav.audit')} subtitle="Every sign-in, registration and change, newest first." />
      <TextField select label="Record type" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(0) }} sx={{ mb: 2, maxWidth: 220 }}>
        <MenuItem value="">All records</MenuItem>
        {ENTITIES.map((e) => <MenuItem key={e} value={e}>{e.charAt(0) + e.slice(1).toLowerCase()}</MenuItem>)}
      </TextField>
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Who</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Record</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.content.map((a) => (
                <TableRow key={a.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(a.at)}</TableCell>
                  <TableCell>{a.actor?.fullName ?? 'System'}</TableCell>
                  <TableCell><Mono>{a.action}</Mono></TableCell>
                  <TableCell><Mono>{a.entity}{a.entityId ? ` #${a.entityId}` : ''}</Mono></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{a.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {data && (
          <TablePagination component="div" count={data.totalElements} page={page} rowsPerPage={50} rowsPerPageOptions={[50]} onPageChange={(_, p) => setPage(p)} />
        )}
      </Paper>
    </>
  )
}
