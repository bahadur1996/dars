import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Autocomplete, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { publicApi } from '../api/endpoints'
import type { PublicComplaint } from '../api/types'
import { setLanguage } from '../i18n'
import { formatDate, Mono, Section, StatusChip } from '../components/common'
import { applyServerErrors, DHAKA_THANAS, errorAt, FormAlert } from '../components/forms'
import { CATEGORY_LABEL } from '../components/Records'
import { COMPLAINT_CATEGORIES, publicComplaintSchema, type PublicComplaintForm, type PublicComplaintInput } from '../schemas'
import { colors, fonts } from '../theme'

const EMPTY: PublicComplaintForm = {
  rickshawNumber: '', driverCode: '', complainantName: '', complainantPhone: '', complainantNid: '',
  category: 'OTHER', description: '', incidentAt: '', thana: '', website: '',
}

const STATUS_TEXT: Record<PublicComplaint['status'], string> = {
  OPEN: 'Received. An officer will look into it.',
  RESOLVED: 'Resolved.',
  REJECTED: 'Closed without action.',
  ESCALATED: 'Taken further: a formal case has been filed.',
}

/** Shell for the pages members of the public can open without an account. */
function PublicShell({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: colors.paper }}>
      <Box sx={{ bgcolor: colors.ink, color: '#E6ECE9', px: { xs: 2, md: 4 }, py: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', maxWidth: 880, mx: 'auto' }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.4rem', letterSpacing: '0.12em' }}>DARS</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" sx={{ color: 'inherit' }} onClick={() => setLanguage(i18n.language === 'bn' ? 'en' : 'bn')}>
              {i18n.language === 'bn' ? 'English' : 'বাংলা'}
            </Button>
            <Button size="small" sx={{ color: 'inherit' }} component={RouterLink} to="/login">Officer sign in</Button>
          </Stack>
        </Stack>
      </Box>
      <Box component="main" sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 }, maxWidth: 880, mx: 'auto' }}>
        {children}
      </Box>
    </Box>
  )
}

/** Public complaint form (FR-14). No login; the backend rate-limits submissions per IP. */
export function PublicComplaintPage() {
  const { t } = useTranslation()
  const form = useForm<PublicComplaintForm, unknown, PublicComplaintInput>({ resolver: zodResolver(publicComplaintSchema), defaultValues: EMPTY })
  const [error, setError] = useState<string | null>(null)
  const [filed, setFiled] = useState<PublicComplaint | null>(null)

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      setFiled(await publicApi.fileComplaint(values))
      form.reset(EMPTY)
    } catch (e) {
      const err = apiError(e)
      if (err.code === 'RICKSHAW_NOT_FOUND') {
        form.setError('rickshawNumber', { type: 'server', message: 'No registered rickshaw has this number. Check the plate or card.' })
        setError('Some fields need fixing. Check the highlighted fields.')
      } else if (err.code === 'DRIVER_NOT_FOUND') {
        form.setError('driverCode', { type: 'server', message: 'No registered driver has this code. Check the registration card.' })
        setError('Some fields need fixing. Check the highlighted fields.')
      } else if (err.code === 'RATE_LIMITED') {
        setError('Too many complaints from this connection. Please try again in an hour.')
      } else {
        setError(applyServerErrors(form, err))
      }
    }
  }, () => setError('Some fields need fixing. Check the highlighted fields.'))

  const err = (n: string) => errorAt(form, n)

  if (filed) {
    return (
      <PublicShell>
        <Section title="Complaint received">
          <Stack spacing={2}>
            <Typography>Your complaint number is</Typography>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: '1.8rem', fontWeight: 600 }}>{filed.complaintNo}</Typography>
            <Typography color="text.secondary">
              Keep this number. You can check progress with it and the phone number you gave.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" component={RouterLink} to={`/complain/status?no=${encodeURIComponent(filed.complaintNo)}`}>Check status</Button>
              <Button onClick={() => setFiled(null)}>File another complaint</Button>
            </Stack>
          </Stack>
        </Section>
      </PublicShell>
    )
  }

  return (
    <PublicShell>
      <Typography variant="h1" component="h1" gutterBottom>{t('action.fileComplaint')}</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Report a problem with a registered auto-rickshaw or its driver. The rickshaw number and the driver code are on
        the registration card inside the vehicle. Your phone and NID are only seen by officers.
      </Typography>
      <FormAlert message={error} />
      <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <Stack spacing={2}>
          <Section title="Rickshaw and driver">
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField
                label="Rickshaw number"
                required
                placeholder="DHK-AR-000123"
                {...form.register('rickshawNumber')}
                error={!!err('rickshawNumber')}
                helperText={err('rickshawNumber')}
                slotProps={{ htmlInput: { style: { textTransform: 'uppercase' }, maxLength: 20 } }}
              />
              <TextField
                label="Driver code"
                required
                placeholder="DRV-2026-000123"
                {...form.register('driverCode')}
                error={!!err('driverCode')}
                helperText={err('driverCode')}
                slotProps={{ htmlInput: { style: { textTransform: 'uppercase' }, maxLength: 20 } }}
              />
            </Box>
          </Section>
          <Section title="What happened">
            <Stack spacing={2}>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <TextField select label="Type of problem" {...field}>
                    {COMPLAINT_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{CATEGORY_LABEL[c]}</MenuItem>)}
                  </TextField>
                )}
              />
              <TextField label="Description" required multiline minRows={4} {...form.register('description')} error={!!err('description')} helperText={err('description')} slotProps={{ htmlInput: { maxLength: 2000 } }} />
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <TextField type="datetime-local" label="When (optional)" {...form.register('incidentAt')} error={!!err('incidentAt')} helperText={err('incidentAt')} slotProps={{ inputLabel: { shrink: true } }} />
                <Controller
                  control={form.control}
                  name="thana"
                  render={({ field }) => (
                    <Autocomplete
                      freeSolo
                      options={DHAKA_THANAS}
                      value={field.value || null}
                      onChange={(_, v) => field.onChange(v ?? '')}
                      onInputChange={(_, v) => field.onChange(v)}
                      renderInput={(p) => <TextField {...p} label="Where (thana, optional)" error={!!err('thana')} helperText={err('thana')} />}
                    />
                  )}
                />
              </Box>
            </Stack>
          </Section>
          <Section title="Your details">
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
              <TextField label="Full name" required autoComplete="name" {...form.register('complainantName')} error={!!err('complainantName')} helperText={err('complainantName')} />
              <TextField label="Mobile" required autoComplete="tel" inputMode="numeric" placeholder="01712345678" {...form.register('complainantPhone')} error={!!err('complainantPhone')} helperText={err('complainantPhone')} />
              <TextField label="NID number" required inputMode="numeric" {...form.register('complainantNid')} error={!!err('complainantNid')} helperText={err('complainantNid')} />
            </Box>
          </Section>
          {/* Honeypot: hidden from people and screen readers; bots that fill it are rejected. */}
          <Box aria-hidden sx={{ position: 'absolute', left: -10000, width: 1, height: 1, overflow: 'hidden' }}>
            <label>
              Website
              <input type="text" tabIndex={-1} autoComplete="off" {...form.register('website')} />
            </label>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Button component={RouterLink} to="/complain/status">Check an existing complaint</Button>
            <Button type="submit" variant="contained" size="large" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Sending…' : 'Submit complaint'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </PublicShell>
  )
}

/** Public status lookup: complaint number + the phone used to file it. */
export function PublicComplaintStatusPage() {
  const [search] = useSearchParams()
  const [no, setNo] = useState(search.get('no') ?? '')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<PublicComplaint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function lookup(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      setResult(await publicApi.complaintStatus(no.trim(), phone.trim()))
    } catch (err) {
      const ae = apiError(err)
      setError(ae.code === 'NOT_FOUND'
        ? 'No complaint matches this number and phone. Check both and try again.'
        : ae.code === 'RATE_LIMITED' ? 'Too many lookups from this connection. Please try again in an hour.' : ae.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PublicShell>
      <Typography variant="h1" component="h1" gutterBottom>Check a complaint</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Enter your complaint number and the mobile number you gave when filing it.</Typography>
      <FormAlert message={error} />
      <Box component="form" onSubmit={lookup} sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' }, mb: 3 }}>
        <TextField label="Complaint number" required placeholder="CMP-2026-000123" value={no} onChange={(e) => setNo(e.target.value)} slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }} />
        <TextField label="Mobile" required inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Checking…' : 'Check'}</Button>
      </Box>
      {result && (
        <Section title="Status" action={<StatusChip status={result.status} />}>
          <Stack spacing={1.5}>
            <Typography><Mono>{result.complaintNo}</Mono>, filed {formatDate(result.filedAt)}</Typography>
            <Alert severity={result.status === 'OPEN' ? 'info' : 'success'} icon={false}>{STATUS_TEXT[result.status]}</Alert>
            {result.resolutionNote && <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.resolutionNote}</Typography>}
          </Stack>
        </Section>
      )}
      <Button component={RouterLink} to="/complain">File a new complaint</Button>
    </PublicShell>
  )
}
