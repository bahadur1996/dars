import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { driverApi } from '../api/endpoints'
import type { Driver } from '../api/types'
import { PageHeader, Section } from '../components/common'
import { AddressFields, applyServerErrors, errorAt, FormAlert } from '../components/forms'
import { PhotoInput } from '../components/PhotoInput'
import { BLOOD_GROUPS, driverSchema, PATTERNS, type DriverForm, type DriverInput } from '../schemas'

const EMPTY_ADDRESS = { division: 'Dhaka', district: 'Dhaka', thana: '', line: '' }
const EMPTY: DriverForm = {
  fullName: '', fatherName: '', dateOfBirth: '', gender: 'MALE', nid: '', licenceNo: '', mobile: '',
  presentAddress: EMPTY_ADDRESS, permanentAddress: EMPTY_ADDRESS, bloodGroup: '', emergencyName: '', emergencyPhone: '',
  photoId: '', nidFrontId: null, nidBackId: null,
}

function toForm(d: Driver): DriverForm {
  return {
    fullName: d.fullName, fatherName: d.fatherName, dateOfBirth: d.dateOfBirth, gender: d.gender, nid: d.nid,
    licenceNo: d.licenceNo ?? '', mobile: d.mobile, presentAddress: d.presentAddress, permanentAddress: d.permanentAddress,
    bloodGroup: d.bloodGroup ?? '', emergencyName: d.emergencyName ?? '', emergencyPhone: d.emergencyPhone ?? '',
    photoId: d.photoId, nidFrontId: d.nidFrontId, nidBackId: d.nidBackId,
  }
}

/** Driver registration form with identification details (FR-3). Also used for editing. */
export function DriverFormPage() {
  const { id } = useParams()
  const editing = id !== undefined
  const [search] = useSearchParams()
  const returnTo = search.get('returnTo')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const existing = useQuery({ queryKey: ['driver', Number(id)], queryFn: () => driverApi.get(Number(id)), enabled: editing })

  const form = useForm<DriverForm, unknown, DriverInput>({ resolver: zodResolver(driverSchema), defaultValues: EMPTY })
  const [error, setError] = useState<string | null>(null)
  const [sameAddress, setSameAddress] = useState(!editing)

  useEffect(() => {
    if (existing.data) form.reset(toForm(existing.data))
  }, [existing.data, form])

  // Live duplicate check: warn as soon as a complete NID is typed.
  const nid = useWatch({ control: form.control, name: 'nid' })
  const nidCheck = useQuery({
    queryKey: ['check-nid', nid],
    queryFn: () => driverApi.checkNid(nid),
    enabled: PATTERNS.nid.test(nid ?? ''),
  })
  const duplicate = nidCheck.data?.exists && nidCheck.data.driver?.id !== existing.data?.id ? nidCheck.data.driver : null

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      const saved = editing ? await driverApi.update(Number(id), values) : await driverApi.create(values)
      await qc.invalidateQueries({ queryKey: ['drivers'] })
      qc.setQueryData(['driver', saved.id], saved)
      navigate(returnTo === 'rickshaw' ? `/rickshaws/new?driverId=${saved.id}` : `/drivers/${saved.id}`)
    } catch (e) {
      setError(applyServerErrors(form, apiError(e)))
    }
  }, () => setError('Some fields need fixing. Check the highlighted fields.'))

  const err = (n: string) => errorAt(form, n)
  const text = (name: keyof DriverForm, label: string, extra: object = {}) => (
    <TextField label={label} {...form.register(name)} error={!!err(name)} helperText={err(name)} {...extra} />
  )

  if (editing && existing.isError) return <Alert severity="error">{apiError(existing.error).message}</Alert>

  return (
    <Box
      component="form"
      noValidate
      onSubmit={(e) => {
        // Hidden permanent-address fields are filled from the present address before validation.
        if (sameAddress) form.setValue('permanentAddress', form.getValues('presentAddress'))
        void submit(e)
      }}
    >
      <PageHeader
        title={editing ? 'Edit driver' : 'Register driver'}
        subtitle={editing ? existing.data?.driverCode : 'A driver code is issued when you save. Fields marked * are required.'}
      />
      <FormAlert message={error} />
      <Stack spacing={2}>
        <Section title="Identity">
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '200px 1fr' } }}>
            <Controller
              control={form.control}
              name="photoId"
              render={({ field }) => (
                <PhotoInput label="Driver photo" hint="Face clearly visible, no sunglasses." required value={field.value || null} onChange={(v) => field.onChange(v ?? '')} error={err('photoId')} />
              )}
            />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, alignContent: 'start' }}>
              {text('fullName', 'Full name (as on NID)', { required: true })}
              {text('fatherName', "Father's or husband's name", { required: true })}
              <TextField
                label="NID number"
                required
                {...form.register('nid')}
                error={!!err('nid') || !!duplicate}
                helperText={err('nid') ?? (duplicate ? `Already registered as ${duplicate.driverCode} (${duplicate.fullName})` : '10 or 17 digits')}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
              {text('dateOfBirth', 'Date of birth', { required: true, type: 'date', slotProps: { inputLabel: { shrink: true } } })}
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <TextField select label="Gender" required {...field} error={!!err('gender')} helperText={err('gender')}>
                    <MenuItem value="MALE">Male</MenuItem>
                    <MenuItem value="FEMALE">Female</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </TextField>
                )}
              />
              {text('mobile', 'Mobile number', { required: true, slotProps: { htmlInput: { inputMode: 'tel' } } })}
              {text('licenceNo', 'Driving licence number', { helperText: err('licenceNo') ?? 'Leave blank if the driver has none.' })}
              <Controller
                control={form.control}
                name="bloodGroup"
                render={({ field }) => (
                  <TextField select label="Blood group" {...field} value={field.value ?? ''} error={!!err('bloodGroup')} helperText={err('bloodGroup')}>
                    <MenuItem value="">Not known</MenuItem>
                    {BLOOD_GROUPS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                  </TextField>
                )}
              />
            </Box>
          </Box>
        </Section>

        <Section title="Address">
          <Stack spacing={2.5}>
            <AddressFields form={form} prefix="presentAddress" title="Present address" />
            <FormControlLabel control={<Checkbox checked={sameAddress} onChange={(e) => setSameAddress(e.target.checked)} />} label="Permanent address is the same as present address" />
            {!sameAddress && <AddressFields form={form} prefix="permanentAddress" title="Permanent address" />}
          </Stack>
        </Section>

        <Section title="NID card and emergency contact">
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1.4fr' } }}>
            <Controller control={form.control} name="nidFrontId" render={({ field }) => <PhotoInput label="NID card, front" value={field.value} onChange={field.onChange} />} />
            <Controller control={form.control} name="nidBackId" render={({ field }) => <PhotoInput label="NID card, back" value={field.value} onChange={field.onChange} />} />
            <Stack spacing={2}>
              {text('emergencyName', 'Emergency contact name')}
              {text('emergencyPhone', 'Emergency contact mobile', { slotProps: { htmlInput: { inputMode: 'tel' } } })}
            </Stack>
          </Box>
        </Section>

        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
          <Button component={RouterLink} to={editing ? `/drivers/${id}` : '/drivers'}>Cancel</Button>
          <Button type="submit" variant="contained" size="large" disabled={form.formState.isSubmitting || !!duplicate}>
            {form.formState.isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Register driver'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
