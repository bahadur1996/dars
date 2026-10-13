import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { caseApi } from '../api/endpoints'
import type { CaseFile, CaseStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AuthImage } from '../components/AuthImage'
import { Field, formatDateTime, Mono, PageHeader, Section, StatusChip } from '../components/common'
import { Plate } from '../components/Plate'
import { StatusMenu } from '../components/StatusMenu'

/** Allowed next statuses; mirrors CaseService.updateStatus. Reopening a final case is ADMIN-only. */
function nextStatuses(status: CaseStatus, admin: boolean): CaseStatus[] {
  switch (status) {
    case 'OPEN': return ['UNDER_INVESTIGATION', 'CLOSED', 'DISMISSED']
    case 'UNDER_INVESTIGATION': return ['CLOSED', 'DISMISSED']
    default: return admin ? ['OPEN'] : []
  }
}

export function CaseDetailPage() {
  const id = Number(useParams().id)
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: c, error } = useQuery({ queryKey: ['case', id], queryFn: () => caseApi.get(id) })

  if (error) return <Alert severity="error">{apiError(error).message}</Alert>
  if (!c) return null

  const options = nextStatuses(c.status, user?.role === 'ADMIN')
  const final = c.status === 'CLOSED' || c.status === 'DISMISSED'
  const onChange = async (status: CaseStatus, note?: string) => {
    const saved: CaseFile = await caseApi.setStatus(id, status, note ?? '')
    qc.setQueryData(['case', id], saved)
    await qc.invalidateQueries({ queryKey: ['cases'] })
    if (c.rickshaw) await qc.invalidateQueries({ queryKey: ['rickshaw', c.rickshaw.id] })
    if (c.driver) await qc.invalidateQueries({ queryKey: ['driver', c.driver.id] })
    await qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  return (
    <>
      <PageHeader
        title={<Mono>{c.caseNo}</Mono>}
        subtitle={`Filed ${formatDateTime(c.filedAt)} by ${c.filedBy.fullName}`}
        actions={
          options.length > 0 && (
            <StatusMenu<CaseStatus>
              current={c.status}
              options={options}
              requireNote
              buttonLabel={final ? 'Reopen case' : 'Update status'}
              onChange={onChange}
            />
          )
        }
      />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' } }}>
        <Stack spacing={2}>
          <Section title={c.offence} action={<StatusChip status={c.status} />}>
            <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{c.description}</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
              <Field label="When it happened">{formatDateTime(c.incidentAt)}</Field>
              <Field label="Thana">{c.thana}</Field>
              <Field label="Last updated">{formatDateTime(c.updatedAt)}</Field>
              {c.closedAt && <Field label="Closed">{formatDateTime(c.closedAt)}</Field>}
              {c.complaint && (
                <Field label="From complaint">
                  <RouterLink to={`/complaints/${c.complaint.id}`}><Mono>{c.complaint.complaintNo}</Mono></RouterLink>
                </Field>
              )}
            </Box>
            {c.resolutionNote && (
              <Box sx={{ mt: 2 }}>
                <Field label="Latest note">
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.resolutionNote}</Typography>
                </Field>
              </Box>
            )}
          </Section>
          <Section title="Evidence">
            {c.evidencePhotoIds.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No photos.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
                {c.evidencePhotoIds.map((p, i) => <AuthImage key={p} id={p} alt={`Evidence ${i + 1}`} size="100%" ratio={4 / 3} />)}
              </Box>
            )}
          </Section>
        </Stack>
        <Section title="Against">
          <Stack spacing={2}>
            {c.rickshaw ? (
              <Button component={RouterLink} to={`/rickshaws/${c.rickshaw.id}`} sx={{ p: 0, alignSelf: 'flex-start' }}>
                <Plate number={c.rickshaw.rickshawNumber} />
              </Button>
            ) : (
              <Typography color="text.secondary" variant="body2">No rickshaw named.</Typography>
            )}
            {c.driver ? (
              <Stack direction="row" spacing={2} component={RouterLink} to={`/drivers/${c.driver.id}`} sx={{ alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
                <AuthImage id={c.driver.photoId} alt="" size={64} ratio={3 / 4} />
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{c.driver.fullName}</Typography>
                  <Typography variant="body2" color="text.secondary"><Mono>{c.driver.driverCode}</Mono></Typography>
                  <StatusChip status={c.driver.status} />
                </Box>
              </Stack>
            ) : (
              <Typography color="text.secondary" variant="body2">No driver named.</Typography>
            )}
          </Stack>
        </Section>
      </Box>
    </>
  )
}
