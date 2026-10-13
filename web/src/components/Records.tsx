import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { CaseFile, Complaint, ComplaintCategory } from '../api/types'
import { formatDate, Mono, StatusChip } from './common'

export const CATEGORY_LABEL: Record<ComplaintCategory, string> = {
  OVERCHARGING: 'Overcharging',
  MISBEHAVIOUR: 'Rude or abusive behaviour',
  RECKLESS_DRIVING: 'Reckless driving',
  ACCIDENT: 'Accident',
  THEFT: 'Theft',
  OTHER: 'Something else',
}

/** Compact complaint list for rickshaw and driver detail pages. */
export function ComplaintRows({ rows }: { rows: Complaint[] | undefined }) {
  if (!rows) return null
  if (rows.length === 0) return <Typography color="text.secondary" variant="body2">No complaints.</Typography>
  return (
    <Table size="small">
      <TableHead>
        <TableRow><TableCell>Complaint</TableCell><TableCell>Category</TableCell><TableCell>Filed</TableCell><TableCell>Status</TableCell></TableRow>
      </TableHead>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell><RouterLink to={`/complaints/${c.id}`}><Mono>{c.complaintNo}</Mono></RouterLink></TableCell>
            <TableCell>{CATEGORY_LABEL[c.category]}</TableCell>
            <TableCell>{formatDate(c.filedAt)}</TableCell>
            <TableCell><StatusChip status={c.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Compact case list for rickshaw and driver detail pages. */
export function CaseRows({ rows }: { rows: CaseFile[] | undefined }) {
  if (!rows) return null
  if (rows.length === 0) return <Typography color="text.secondary" variant="body2">No cases.</Typography>
  return (
    <Table size="small">
      <TableHead>
        <TableRow><TableCell>Case</TableCell><TableCell>Offence</TableCell><TableCell>Filed</TableCell><TableCell>Status</TableCell></TableRow>
      </TableHead>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell><RouterLink to={`/cases/${c.id}`}><Mono>{c.caseNo}</Mono></RouterLink></TableCell>
            <TableCell>{c.offence}</TableCell>
            <TableCell>{formatDate(c.filedAt)}</TableCell>
            <TableCell><StatusChip status={c.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
