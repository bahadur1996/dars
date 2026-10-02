import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { apiError } from '../api/client'
import { FormAlert } from './forms'

const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** Admin-only status change with a recorded reason. */
export function StatusMenu<S extends string>({ current, options, onChange }: { current: S; options: S[]; onChange: (s: S, reason?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<S>(current)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await onChange(status, reason.trim() || undefined)
      setOpen(false)
    } catch (e) {
      setError(apiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="outlined" color="inherit" onClick={() => { setStatus(current); setReason(''); setOpen(true) }}>
        Change status
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change status</DialogTitle>
        <DialogContent>
          <FormAlert message={error} />
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="New status" value={status} onChange={(e) => setStatus(e.target.value as S)}>
              {options.map((o) => <MenuItem key={o} value={o}>{label(o)}</MenuItem>)}
            </TextField>
            <TextField label="Reason" multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} helperText="Saved in the audit log." slotProps={{ htmlInput: { maxLength: 500 } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={busy || status === current} onClick={() => void save()}>
            Set to {label(status)}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
