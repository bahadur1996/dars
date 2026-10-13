import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { apiError } from '../api/client'
import { enumLabel as label } from './common'
import { FormAlert } from './forms'

/**
 * Status change with a recorded reason. Rickshaw and driver status is admin-only; complaints and cases pass
 * `requireNote` (the backend rejects a blank note) and limit `options` to the allowed next statuses.
 */
export function StatusMenu<S extends string>({ current, options, onChange, requireNote = false, buttonLabel = 'Change status' }: {
  current: S
  options: S[]
  onChange: (s: S, reason?: string) => Promise<void>
  requireNote?: boolean
  buttonLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<S>(options.includes(current) ? current : options[0])
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
      <Button variant="outlined" color="inherit" onClick={() => { setStatus(options.includes(current) ? current : options[0]); setReason(''); setOpen(true) }}>
        {buttonLabel}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{buttonLabel}</DialogTitle>
        <DialogContent>
          <FormAlert message={error} />
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="New status" value={status} onChange={(e) => setStatus(e.target.value as S)}>
              {options.map((o) => <MenuItem key={o} value={o}>{label(o)}</MenuItem>)}
            </TextField>
            <TextField
              label={requireNote ? 'Note' : 'Reason'}
              required={requireNote}
              multiline
              minRows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              helperText={requireNote ? 'Required. Saved with the record and in the audit log.' : 'Saved in the audit log.'}
              slotProps={{ htmlInput: { maxLength: requireNote ? 1000 : 500 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={busy || status === current || (requireNote && !reason.trim())} onClick={() => void save()}>
            Set to {label(status)}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
