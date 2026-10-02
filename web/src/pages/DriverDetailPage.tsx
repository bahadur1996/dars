import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { driverApi } from '../api/endpoints'
import type { Address, DriverStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AuthImage } from '../components/AuthImage'
import { Field, formatDate, formatDateTime, Mono, PageHeader, Section, StatusChip } from '../components/common'
import { Plate } from '../components/Plate'
import { StatusMenu } from '../components/StatusMenu'
import { canEdit } from '../lib/permissions'

const addr = (a: Address) => `${a.line}, ${a.thana}, ${a.district}, ${a.division}`

export function DriverDetailPage() {
  const id = Number(useParams().id)
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: d, error } = useQuery({ queryKey: ['driver', id], queryFn: () => driverApi.get(id) })

  if (error) return <Alert severity="error">{apiError(error).message}</Alert>
  if (!d) return null

  return (
    <>
      <PageHeader
        title={d.fullName}
        subtitle={<><Mono>{d.driverCode}</Mono> · registered {formatDate(d.registeredAt)} by {d.registeredBy.fullName}</>}
        actions={
          <>
            {user?.role === 'ADMIN' && (
              <StatusMenu<DriverStatus>
                current={d.status}
                options={['ACTIVE', 'SUSPENDED', 'BLACKLISTED']}
                onChange={async (status, reason) => {
                  qc.setQueryData(['driver', id], await driverApi.setStatus(id, status, reason))
                  await qc.invalidateQueries({ queryKey: ['drivers'] })
                }}
              />
            )}
            {canEdit(user, d.registeredBy.id, d.registeredAt) && (
              <Button variant="outlined" component={RouterLink} to={`/drivers/${id}/edit`}>Edit driver</Button>
            )}
          </>
        }
      />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '280px 1fr' } }}>
        <Stack spacing={2}>
          <AuthImage id={d.photoId} alt={`Photo of ${d.fullName}`} size="100%" ratio={3 / 4} />
          <Section title="Drives">
            {d.currentRickshaw ? (
              <Button component={RouterLink} to={`/rickshaws/${d.currentRickshaw.id}`} sx={{ p: 0 }}>
                <Plate number={d.currentRickshaw.rickshawNumber} />
              </Button>
            ) : (
              <Typography color="text.secondary" variant="body2">Not assigned to a rickshaw.</Typography>
            )}
          </Section>
        </Stack>
        <Stack spacing={2}>
          <Section title="Identification" action={<StatusChip status={d.status} />}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
              <Field label="NID number"><Mono>{d.nid}</Mono></Field>
              <Field label="Date of birth">{formatDate(d.dateOfBirth)}</Field>
              <Field label="Gender">{d.gender.charAt(0) + d.gender.slice(1).toLowerCase()}</Field>
              <Field label="Father's or husband's name">{d.fatherName}</Field>
              <Field label="Mobile"><Mono>{d.mobile}</Mono></Field>
              <Field label="Driving licence">{d.licenceNo ? <Mono>{d.licenceNo}</Mono> : 'None'}</Field>
              <Field label="Blood group">{d.bloodGroup ?? 'Not known'}</Field>
              <Field label="Emergency contact">{d.emergencyName ? `${d.emergencyName}${d.emergencyPhone ? ` · ${d.emergencyPhone}` : ''}` : 'None'}</Field>
              <Field label="Last updated">{formatDateTime(d.updatedAt)}</Field>
            </Box>
          </Section>
          <Section title="Address">
            <Stack spacing={1.5}>
              <Field label="Present">{addr(d.presentAddress)}</Field>
              <Field label="Permanent">{addr(d.permanentAddress)}</Field>
            </Stack>
          </Section>
          <Section title="NID card">
            <Stack direction="row" spacing={2}>
              <AuthImage id={d.nidFrontId} alt="NID front" size={220} ratio={1.6} />
              <AuthImage id={d.nidBackId} alt="NID back" size={220} ratio={1.6} />
            </Stack>
          </Section>
        </Stack>
      </Box>
    </>
  )
}
