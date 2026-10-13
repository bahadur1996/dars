import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, Navigate, useParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { publicApi, rickshawApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { Field, formatDate, Section, StatusChip } from '../components/common'
import { Plate } from '../components/Plate'
import { PublicShell } from './PublicComplaintPages'

function Loading() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress aria-label="Loading" />
    </Box>
  )
}

/**
 * Target of the vehicle QR code (FR-17): `/r/:number`. A signed-in officer is sent straight to the
 * rickshaw's detail page; anyone else sees the public verify view and can sign in to continue.
 */
export function RickshawScanPage() {
  const number = (useParams().number ?? '').trim().toUpperCase()
  const { user, restoring } = useAuth()
  if (restoring) return <Loading />
  return user ? <OfficerRedirect number={number} /> : <PublicVerifyView number={number} />
}

function OfficerRedirect({ number }: { number: string }) {
  const { data, error } = useQuery({ queryKey: ['rickshaw', 'by-number', number], queryFn: () => rickshawApi.byNumber(number), retry: false })
  if (data) return <Navigate to={`/rickshaws/${data.id}`} replace />
  if (!error) return <Loading />
  const notFound = apiError(error).code === 'NOT_FOUND'
  return (
    <PublicShell>
      <Alert severity={notFound ? 'warning' : 'error'} sx={{ mb: 2 }}>
        {notFound ? `${number} is not registered. The card may be fake.` : apiError(error).message}
      </Alert>
      <Button variant="contained" component={RouterLink} to="/rickshaws">Search rickshaws</Button>
    </PublicShell>
  )
}

function PublicVerifyView({ number }: { number: string }) {
  const { data, error } = useQuery({ queryKey: ['public', 'verify', number], queryFn: () => publicApi.verify(number), retry: false })
  const signIn = <Button component={RouterLink} to="/login" state={{ from: `/r/${encodeURIComponent(number)}` }}>Officer sign in</Button>

  if (error) {
    const notFound = apiError(error).code === 'NOT_FOUND'
    return (
      <PublicShell>
        <Alert severity={notFound ? 'warning' : 'error'} sx={{ mb: 2 }}>
          {notFound ? `${number} is not a registered auto-rickshaw. The card may be fake.` : apiError(error).message}
        </Alert>
        {signIn}
      </PublicShell>
    )
  }
  if (!data) return <Loading />

  return (
    <PublicShell>
      <Section title="Registered auto-rickshaw" action={<StatusChip status={data.status} />}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, alignItems: 'start' }}>
          <Box component="img" src={publicApi.verifyPhotoUrl(data.rickshawNumber)} alt="Vehicle photo"
            sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 1, display: 'block' }} />
          <Stack spacing={2}>
            <Plate number={data.rickshawNumber} size="md" />
            <Field label="Registered">{formatDate(data.registeredAt)}</Field>
            {data.status !== 'ACTIVE' && (
              <Typography color="warning.main">This vehicle is not currently allowed to operate.</Typography>
            )}
          </Stack>
        </Box>
      </Section>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
        <Button variant="outlined" component={RouterLink} to={`/complain?rickshaw=${encodeURIComponent(data.rickshawNumber)}`}>
          Report a problem
        </Button>
        {signIn}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Officers who sign in are taken to the full record.
      </Typography>
    </PublicShell>
  )
}
