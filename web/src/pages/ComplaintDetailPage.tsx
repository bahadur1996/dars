import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { complaintApi } from '../api/endpoints'
import type { ComplaintStatus } from '../api/types'
import { AuthImage } from '../components/AuthImage'
import { Field, formatDateTime, Mono, PageHeader, Section, StatusChip } from '../components/common'
import { Plate } from '../components/Plate'
import { CATEGORY_LABEL } from '../components/Records'
import { StatusMenu } from '../components/StatusMenu'

export function ComplaintDetailPage() {
  const id = Number(useParams().id)
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: c, error } = useQuery({ queryKey: ['complaint', id], queryFn: () => complaintApi.get(id) })

  if (error) return <Alert severity="error">{apiError(error).message}</Alert>
  if (!c) return null

  const open = c.status === 'OPEN'
  return (
    <>
      <PageHeader
        title={<Mono>{c.complaintNo}</Mono>}
        subtitle={`Filed ${formatDateTime(c.filedAt)} · ${CATEGORY_LABEL[c.category]}`}
        actions={
          open && (
            <>
              <StatusMenu<ComplaintStatus>
                current={c.status}
                options={['RESOLVED', 'REJECTED']}
                requireNote
                buttonLabel="Resolve or reject"
                onChange={async (status, note) => {
                  qc.setQueryData(['complaint', id], await complaintApi.setStatus(id, status, note ?? ''))
                  await qc.invalidateQueries({ queryKey: ['complaints'] })
                  await qc.invalidateQueries({ queryKey: ['rickshaw', c.rickshaw.id] })
                  await qc.invalidateQueries({ queryKey: ['driver', c.driver.id] })
                  await qc.invalidateQueries({ queryKey: ['dashboard'] })
                }}
              />
              <Button variant="contained" component={RouterLink} to={`/cases/new?complaintId=${id}`}>{t('action.fileCase')}</Button>
            </>
          )
        }
      />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' } }}>
        <Stack spacing={2}>
          <Section title="Complaint" action={<StatusChip status={c.status} />}>
            <Typography sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{c.description}</Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
              <Field label="Category">{CATEGORY_LABEL[c.category]}</Field>
              <Field label="When it happened">{c.incidentAt ? formatDateTime(c.incidentAt) : 'Not given'}</Field>
              <Field label="Where">{c.thana ?? 'Not given'}</Field>
            </Box>
          </Section>
          {!open && (
            <Section title="Outcome">
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
                <Field label="Status"><StatusChip status={c.status} /></Field>
                <Field label="Handled by">{c.handledBy?.fullName ?? '—'}</Field>
                <Field label="Updated">{formatDateTime(c.updatedAt)}</Field>
              </Box>
              {c.resolutionNote && <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{c.resolutionNote}</Typography>}
              {c.caseFile && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Escalated to case <RouterLink to={`/cases/${c.caseFile.id}`}><Mono>{c.caseFile.caseNo}</Mono></RouterLink>{' '}
                  (<StatusChip status={c.caseFile.status} />)
                </Alert>
              )}
            </Section>
          )}
        </Stack>
        <Stack spacing={2}>
          <Section title="Against">
            <Stack spacing={2}>
              <Button component={RouterLink} to={`/rickshaws/${c.rickshaw.id}`} sx={{ p: 0, alignSelf: 'flex-start' }}>
                <Plate number={c.rickshaw.rickshawNumber} />
              </Button>
              <Stack direction="row" spacing={2} component={RouterLink} to={`/drivers/${c.driver.id}`} sx={{ alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
                <AuthImage id={c.driver.photoId} alt="" size={64} ratio={3 / 4} />
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{c.driver.fullName}</Typography>
                  <Typography variant="body2" color="text.secondary"><Mono>{c.driver.driverCode}</Mono></Typography>
                  <StatusChip status={c.driver.status} />
                </Box>
              </Stack>
            </Stack>
          </Section>
          <Section title="Complainant">
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <Field label="Name">{c.complainantName}</Field>
              <Field label="Phone"><Mono>{c.complainantPhone}</Mono></Field>
              <Field label="NID"><Mono>{c.complainantNid}</Mono></Field>
            </Box>
          </Section>
        </Stack>
      </Box>
    </>
  )
}
