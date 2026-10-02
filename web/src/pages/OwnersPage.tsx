import { Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ownerApi } from '../api/endpoints'
import type { Owner } from '../api/types'
import { EmptyState, formatDate, Mono, PageHeader } from '../components/common'
import { OwnerDialog } from '../components/OwnerDialog'

export function OwnersPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [dialog, setDialog] = useState<{ owner?: Owner } | null>(null)
  const { data } = useQuery({ queryKey: ['owners', q, page], queryFn: () => ownerApi.search({ q, page, size: 20 }), placeholderData: keepPreviousData })

  return (
    <>
      <PageHeader
        title={t('nav.owners')}
        subtitle="Owners are added while registering a rickshaw, or here."
        actions={<Button variant="contained" onClick={() => setDialog({})}>Add owner</Button>}
      />
      <Stack component="form" direction="row" spacing={1.5} sx={{ mb: 2 }} onSubmit={(e) => { e.preventDefault(); setQ(input.trim()); setPage(0) }}>
        <TextField label="Search owners" placeholder="Name, NID or mobile" value={input} onChange={(e) => setInput(e.target.value)} />
        <Button type="submit" variant="outlined">Search</Button>
      </Stack>
      <Paper>
        {data && data.totalElements === 0 ? (
          <EmptyState title="No owners found"><Typography color="text.secondary">Try another search, or add an owner.</Typography></EmptyState>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>NID</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Address</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Added</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.content.map((o) => (
                  <TableRow key={o.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDialog({ owner: o })}>
                    <TableCell>{o.fullName}</TableCell>
                    <TableCell><Mono>{o.nid}</Mono></TableCell>
                    <TableCell><Mono>{o.mobile}</Mono></TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{o.address.line}, {o.address.thana}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{formatDate(o.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {data && data.totalElements > 0 && (
          <TablePagination component="div" count={data.totalElements} page={page} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_, p) => setPage(p)} />
        )}
      </Paper>
      <OwnerDialog
        open={!!dialog}
        owner={dialog?.owner}
        onClose={() => setDialog(null)}
        onSaved={async () => {
          setDialog(null)
          await qc.invalidateQueries({ queryKey: ['owners'] })
        }}
      />
    </>
  )
}
