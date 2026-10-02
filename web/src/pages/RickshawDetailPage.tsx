import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import PrintOutlined from '@mui/icons-material/PrintOutlined'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { rickshawApi } from '../api/endpoints'
import type { Driver, RickshawStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AuthImage } from '../components/AuthImage'
import { Field, formatDate, formatDateTime, Mono, PageHeader, Section, StatusChip } from '../components/common'
import { FormAlert } from '../components/forms'
import { OwnerDialog } from '../components/OwnerDialog'
import { DriverPicker } from '../components/Pickers'
import { Plate } from '../components/Plate'
import { StatusMenu } from '../components/StatusMenu'
import { canEdit } from '../lib/permissions'

export function RickshawDetailPage() {
  const id = Number(useParams().id)
  const { user } = useAuth()
  const location = useLocation()
  const qc = useQueryClient()
  const { data: r, error } = useQuery({ queryKey: ['rickshaw', id], queryFn: () => rickshawApi.get(id) })
  const history = useQuery({ queryKey: ['rickshaw', id, 'history'], queryFn: () => rickshawApi.history(id) })
  const [reassignOpen, setReassignOpen] = useState(false)
  const [ownerOpen, setOwnerOpen] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const justRegistered = (location.state as { justRegistered?: boolean } | null)?.justRegistered

  if (error) return <Alert severity="error">{apiError(error).message}</Alert>
  if (!r) return null

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['rickshaw', id] })
    await qc.invalidateQueries({ queryKey: ['rickshaws'] })
    await qc.invalidateQueries({ queryKey: ['drivers'] })
  }

  async function printCard() {
    setPrintError(null)
    // Open the tab synchronously so pop-up blockers allow it, then point it at the PDF.
    const win = window.open('', '_blank')
    try {
      const url = URL.createObjectURL(await rickshawApi.cardPdf(id))
      if (win) win.location.href = url
      else window.location.href = url
    } catch (e) {
      win?.close()
      setPrintError(apiError(e).message)
    }
  }

  const editable = canEdit(user, r.registeredBy.id, r.registeredAt)
  return (
    <>
      {justRegistered && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Registered as <strong>{r.rickshawNumber}</strong>. Print the card and attach it to the vehicle.
        </Alert>
      )}
      <PageHeader
        title={<Plate number={r.rickshawNumber} size="lg" />}
        subtitle={`Registered ${formatDate(r.registeredAt)} by ${r.registeredBy.fullName} · ${r.thana}`}
        actions={
          <>
            {user?.role === 'ADMIN' && (
              <StatusMenu<RickshawStatus>
                current={r.status}
                options={['ACTIVE', 'SUSPENDED', 'IMPOUNDED']}
                onChange={async (status, reason) => {
                  qc.setQueryData(['rickshaw', id], await rickshawApi.setStatus(id, status, reason))
                  await qc.invalidateQueries({ queryKey: ['rickshaws'] })
                }}
              />
            )}
            {editable && <Button variant="outlined" component={RouterLink} to={`/rickshaws/${id}/edit`}>Edit vehicle</Button>}
            <Button variant="contained" startIcon={<PrintOutlined />} onClick={() => void printCard()}>Print card</Button>
          </>
        }
      />
      <FormAlert message={printError} />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' } }}>
        <Stack spacing={2}>
          <Section title="Photos" action={<StatusChip status={r.status} />}>
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: '1fr 1fr' }}>
              <AuthImage id={r.photoId} alt="Side photo" size="100%" ratio={4 / 3} />
              <AuthImage id={r.rearPhotoId} alt="Rear photo" size="100%" ratio={4 / 3} />
            </Box>
          </Section>
          <Section title="Vehicle">
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
              <Field label="Thana">{r.thana}</Field>
              <Field label="Colour">{r.color ?? '—'}</Field>
              <Field label="Make / model">{r.model ?? '—'}</Field>
              <Field label="Chassis number">{r.chassisNo ? <Mono>{r.chassisNo}</Mono> : '—'}</Field>
              <Field label="Motor number">{r.motorNo ? <Mono>{r.motorNo}</Mono> : '—'}</Field>
              <Field label="Last updated">{formatDateTime(r.updatedAt)}</Field>
            </Box>
          </Section>
        </Stack>
        <Stack spacing={2}>
          <Section title="Driver" action={<Button size="small" onClick={() => setReassignOpen(true)}>Change driver</Button>}>
            {r.currentDriver ? (
              <Stack direction="row" spacing={2} component={RouterLink} to={`/drivers/${r.currentDriver.id}`} sx={{ alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
                <AuthImage id={r.currentDriver.photoId} alt="" size={72} ratio={3 / 4} />
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{r.currentDriver.fullName}</Typography>
                  <Typography variant="body2" color="text.secondary"><Mono>{r.currentDriver.driverCode}</Mono></Typography>
                  <Typography variant="body2" color="text.secondary">NID <Mono>{r.currentDriver.nid}</Mono> · <Mono>{r.currentDriver.mobile}</Mono></Typography>
                </Box>
              </Stack>
            ) : (
              <Typography color="text.secondary">No driver assigned.</Typography>
            )}
          </Section>
          <Section title="Owner" action={editable && <Button size="small" onClick={() => setOwnerOpen(true)}>Edit owner</Button>}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <Field label="Name">{r.owner.fullName}</Field>
              <Field label="NID"><Mono>{r.owner.nid}</Mono></Field>
              <Field label="Mobile"><Mono>{r.owner.mobile}</Mono></Field>
              <Field label="Address">{`${r.owner.address.line}, ${r.owner.address.thana}`}</Field>
            </Box>
          </Section>
          <Section title="Driver history">
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Driver</TableCell><TableCell>From</TableCell><TableCell>To</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {history.data?.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell><RouterLink to={`/drivers/${a.driver.id}`}>{a.driver.fullName}</RouterLink></TableCell>
                    <TableCell>{formatDate(a.fromDate)}</TableCell>
                    <TableCell>{a.toDate ? formatDate(a.toDate) : <strong>Current</strong>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </Stack>
      </Box>
      <ReassignDialog
        open={reassignOpen}
        rickshawId={id}
        onClose={() => setReassignOpen(false)}
        onDone={async () => {
          setReassignOpen(false)
          await refresh()
        }}
      />
      <OwnerDialog
        open={ownerOpen}
        owner={r.owner}
        onClose={() => setOwnerOpen(false)}
        onSaved={async () => {
          setOwnerOpen(false)
          await refresh()
        }}
      />
    </>
  )
}

function ReassignDialog({ open, rickshawId, onClose, onDone }: { open: boolean; rickshawId: number; onClose: () => void; onDone: () => Promise<void> }) {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!driver) return
    setBusy(true)
    setError(null)
    try {
      await rickshawApi.reassign(rickshawId, driver.id)
      setDriver(null)
      await onDone()
    } catch (e) {
      setError(apiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change driver</DialogTitle>
      <DialogContent>
        <FormAlert message={error} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The current driver's assignment ends today and stays in the history.
        </Typography>
        <DriverPicker value={driver} onChange={setDriver} label="New driver" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!driver || busy} onClick={() => void save()}>Assign driver</Button>
      </DialogActions>
    </Dialog>
  )
}
