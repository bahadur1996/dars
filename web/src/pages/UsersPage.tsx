import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { apiError } from '../api/client'
import { userApi } from '../api/endpoints'
import type { User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { formatDate, PageHeader } from '../components/common'
import { applyServerErrors, FormAlert } from '../components/forms'
import { userSchema, type UserForm } from '../schemas'

/** Officer management (FR-2). Admin only. */
export function UsersPage() {
  const { t } = useTranslation()
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['users'], queryFn: () => userApi.list({ size: 200 }) })
  const [createOpen, setCreateOpen] = useState(false)
  const [resetFor, setResetFor] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggle(u: User) {
    setError(null)
    try {
      await userApi.update(u.id, { enabled: !u.enabled })
      await qc.invalidateQueries({ queryKey: ['users'] })
    } catch (e) {
      setError(apiError(e).message)
    }
  }

  return (
    <>
      <PageHeader
        title={t('nav.users')}
        subtitle="Only people with an account here can register rickshaws and drivers."
        actions={<Button variant="contained" onClick={() => setCreateOpen(true)}>Add officer</Button>}
      />
      <FormAlert message={error} />
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Added</TableCell>
                <TableCell>Can sign in</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.content.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Chip size="small" label={u.role === 'ADMIN' ? 'Admin' : 'Officer'} variant="outlined" />
                      {u.locked && <Chip size="small" label="Locked" color="warning" />}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{formatDate(u.createdAt)}</TableCell>
                  <TableCell>
                    <Switch checked={u.enabled} disabled={u.id === me?.id} onChange={() => void toggle(u)} slotProps={{ input: { 'aria-label': `${u.enabled ? 'Disable' : 'Enable'} ${u.username}` } }} />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setResetFor(u)}>Reset password</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={async () => { setCreateOpen(false); await qc.invalidateQueries({ queryKey: ['users'] }) }} />
      <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(null)} onDone={async () => { setResetFor(null); await qc.invalidateQueries({ queryKey: ['users'] }) }} />
    </>
  )
}

function CreateUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => Promise<void> }) {
  const form = useForm<UserForm>({ resolver: zodResolver(userSchema), defaultValues: { username: '', password: '', fullName: '', role: 'OFFICER' } })
  const [error, setError] = useState<string | null>(null)
  const e = form.formState.errors
  const submit = form.handleSubmit(async (v) => {
    setError(null)
    try {
      await userApi.create(v)
      form.reset()
      await onCreated()
    } catch (err) {
      setError(applyServerErrors(form, apiError(err)))
    }
  })
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add officer</DialogTitle>
      <DialogContent>
        <FormAlert message={error} />
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Full name" {...form.register('fullName')} error={!!e.fullName} helperText={e.fullName?.message} />
          <TextField label="Username" {...form.register('username')} error={!!e.username} helperText={e.username?.message} autoComplete="off" />
          <TextField label="Temporary password" type="password" {...form.register('password')} error={!!e.password} helperText={e.password?.message ?? 'Share it in person. They can change it after signing in.'} autoComplete="new-password" />
          <Controller control={form.control} name="role" render={({ field }) => (
            <TextField select label="Role" {...field}>
              <MenuItem value="OFFICER">Officer: registers rickshaws and drivers</MenuItem>
              <MenuItem value="ADMIN">Admin: also manages officers and statuses</MenuItem>
            </TextField>
          )} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void submit()} disabled={form.formState.isSubmitting}>Add officer</Button>
      </DialogActions>
    </Dialog>
  )
}

function ResetPasswordDialog({ user, onClose, onDone }: { user: User | null; onClose: () => void; onDone: () => Promise<void> }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  async function save() {
    if (!user) return
    if (pw.length < 8) return setError('The password needs at least 8 characters.')
    try {
      await userApi.update(user.id, { newPassword: pw })
      setPw('')
      setError(null)
      await onDone()
    } catch (e) {
      setError(apiError(e).message)
    }
  }
  return (
    <Dialog open={!!user} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reset password for {user?.username}</DialogTitle>
      <DialogContent>
        <FormAlert message={error} />
        <TextField sx={{ mt: 1 }} label="New temporary password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} helperText="This also unlocks the account." autoComplete="new-password" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void save()}>Reset password</Button>
      </DialogActions>
    </Dialog>
  )
}
