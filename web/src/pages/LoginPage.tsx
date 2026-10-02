import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { apiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { FormAlert } from '../components/forms'
import { Plate } from '../components/Plate'
import { colors, fonts } from '../theme'

export function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(apiError(err).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' } }}>
      <Box
        sx={{
          bgcolor: colors.ink,
          color: '#E6ECE9',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
        }}
      >
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, letterSpacing: '0.12em', fontSize: '1.4rem' }}>DARS</Typography>
        <Box>
          <Plate number="DHK-AR-000001" size="lg" />
          <Typography sx={{ fontFamily: fonts.display, fontSize: '2.6rem', fontWeight: 600, lineHeight: 1.05, mt: 4, maxWidth: 460 }}>
            Every auto-rickshaw in Dhaka, with a number and a known driver.
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.6 }}>
          For authorized registration officers only. Every action is recorded.
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', placeItems: 'center', p: 3 }}>
        <Box component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 360 }}>
          <Typography variant="h2" component="h1" gutterBottom>
            Sign in
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Use the officer account your administrator gave you.
          </Typography>
          <FormAlert message={error} />
          <Stack spacing={2}>
            <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required size="medium" />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required size="medium" />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}
