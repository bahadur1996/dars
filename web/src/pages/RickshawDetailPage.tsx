import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import PrintOutlined from '@mui/icons-material/PrintOutlined'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { rickshawApi } from '../api/endpoints'
import type { Owner, RickshawStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AuthImage } from '../components/AuthImage'
import { Field, formatDate, formatDateTime, Mono, PageHeader, Section, StatusChip } from '../components/common'
import { FormAlert } from '../components/forms'
import { OwnerDialog } from '../components/OwnerDialog'
import { OwnerPicker } from '../components/Pickers'
import { Plate } from '../components/Plate'
import { CaseRows, ComplaintRows } from '../components/Records'
import { StatusMenu } from '../components/StatusMenu'
import { canEdit } from '../lib/permissions'

export function RickshawDetailPage() {
  const id = Number(useParams().id)
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const qc = useQueryClient()
  const { data: r, error } = useQuery({ queryKey: ['rickshaw', id], queryFn: () => rickshawApi.get(id) })
  const ownership = useQuery({ queryKey: ['rickshaw', id, 'ownership'], queryFn: () => rickshawApi.ownership(id) })
  const complaints = useQuery({ queryKey: ['rickshaw', id, 'complaints'], queryFn: () => rickshawApi.complaints(id) })
  const cases = useQuery({ queryKey: ['rickshaw', id, 'cases'], queryFn: () => rickshawApi.cases(id) })
  const [transferOpen, setTransferOpen] = useState(false)
  const [ownerOpen, setOwnerOpen] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const justRegistered = (location.state as { justRegistered?: boolean } | null)?.justRegistered

  if (error) return <Alert severity="error">{apiError(error).message}</Alert>
  if (!r) return null

  // ['rickshaw', id] is a prefix of the ownership/complaints/cases keys, so this refreshes them too.
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['rickshaw', id] })
    await qc.invalidateQueries({ queryKey: ['rickshaws'] })
    await qc.invalidateQueries({ queryKey: ['owners'] })
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
            <Button variant="outlined" component={RouterLink} to={`/cases/new?rickshawId=${id}`}>{t('action.fileCase')}</Button>
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
          <Section title="Complaints">
            <ComplaintRows rows={complaints.data} />
          </Section>
          <Section title="Cases">
            <CaseRows rows={cases.data} />
          </Section>
        </Stack>
        <Stack spacing={2}>
          <Section
            title="Owner"
            action={
              <Stack direction="row" spacing={1}>
                {editable && <Button size="small" onClick={() => setOwnerOpen(true)}>Edit details</Button>}
                <Button size="small" variant="outlined" onClick={() => setTransferOpen(true)}>Change owner</Button>
              </Stack>
            }
          >
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <Field label="Name">{r.owner.fullName}</Field>
              <Field label="NID"><Mono>{r.owner.nid}</Mono></Field>
              <Field label="Mobile"><Mono>{r.owner.mobile}</Mono></Field>
              <Field label="Address">{`${r.owner.address.line}, ${r.owner.address.thana}`}</Field>
            </Box>
          </Section>
          <Section title="Ownership history">
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Owner</TableCell><TableCell>From</TableCell><TableCell>To</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {ownership.data?.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      {o.owner.fullName}
                      {o.note && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{o.note}</Typography>}
                    </TableCell>
                    <TableCell>{formatDate(o.fromDate)}</TableCell>
                    <TableCell>{o.toDate ? formatDate(o.toDate) : <strong>Current</strong>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </Stack>
      </Box>
      <TransferDialog
        open={transferOpen}
        rickshawId={id}
        currentOwnerId={r.owner.id}
        onClose={() => setTransferOpen(false)}
        onDone={async () => {
          setTransferOpen(false)
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

/** FR-13: hand the rickshaw to another owner. The old ownership period ends today and stays in the history. */
function TransferDialog({ open, rickshawId, currentOwnerId, onClose, onDone }: {
  open: boolean
  rickshawId: number
  currentOwnerId: number
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [note, setNote] = useState('')
  const [newOwnerOpen, setNewOwnerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!owner) return
    setBusy(true)
    setError(null)
    try {
      await rickshawApi.transferOwnership(rickshawId, owner.id, note.trim() || undefined)
      setOwner(null)
      setNote('')
      await onDone()
    } catch (e) {
      setError(apiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  const same = owner?.id === currentOwnerId
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change owner</DialogTitle>
      <DialogContent>
        <FormAlert message={error} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The current owner's period ends today and stays in the ownership history.
        </Typography>
        <Stack spacing={2}>
          <OwnerPicker value={owner} onChange={setOwner} label="New owner" error={same ? 'This is already the owner.' : undefined} />
          <Box>
            <Button size="small" onClick={() => setNewOwnerOpen(true)}>Add a new owner</Button>
          </Box>
          <TextField label="Note" placeholder="e.g. Sold on 12 Oct" value={note} onChange={(e) => setNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
        </Stack>
        <OwnerDialog
          open={newOwnerOpen}
          onClose={() => setNewOwnerOpen(false)}
          onSaved={(o) => {
            setOwner(o)
            setNewOwnerOpen(false)
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!owner || same || busy} onClick={() => void save()}>Transfer ownership</Button>
      </DialogActions>
    </Dialog>
  )
}
