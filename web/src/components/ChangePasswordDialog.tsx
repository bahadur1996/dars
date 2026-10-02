import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { useState } from 'react'
import { apiError } from '../api/client'
import { authApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { FormAlert } from './forms'

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (next.length < 8) {
      setError('The new password needs at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      await authApi.changePassword(current, next)
      // All sessions are revoked server-side; sign in again with the new password.
      await logout()
    } catch (e) {
      setError(apiError(e).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Change password</DialogTitle>
      <DialogContent>
        <FormAlert message={error} />
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField type="password" label="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          <TextField type="password" label="New password" helperText="At least 8 characters. You'll sign in again after changing it." value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={busy || !current || !next}>
          Change password
        </Button>
      </DialogActions>
    </Dialog>
  )
}
