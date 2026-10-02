import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Autocomplete, Box, Button, Checkbox, FormControlLabel, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { driverApi, rickshawApi } from '../api/endpoints'
import type { Driver, Owner } from '../api/types'
import { AuthImage } from '../components/AuthImage'
import { Field, Mono, PageHeader, Section } from '../components/common'
import { applyServerErrors, DHAKA_THANAS, errorAt, FormAlert } from '../components/forms'
import { OwnerDialog } from '../components/OwnerDialog'
import { DriverPicker, OwnerPicker } from '../components/Pickers'
import { PhotoInput } from '../components/PhotoInput'
import { Plate } from '../components/Plate'
import { rickshawSchema, type OwnerForm, type RickshawForm, type RickshawInput } from '../schemas'

// The order matters: the vehicle can't be registered without a driver and owner.
const STEPS = ['Driver', 'Owner', 'Vehicle', 'Review']

const EMPTY: RickshawForm = {
  rickshawNumber: '', chassisNo: '', motorNo: '', color: '', model: '', thana: '',
  photoId: '', rearPhotoId: null, ownerId: undefined as unknown as number, driverId: undefined as unknown as number,
}

/** Register a rickshaw (FR-5) or, with an :id, edit its vehicle details. */
export function RickshawWizardPage() {
  const { id } = useParams()
  const editing = id !== undefined
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const form = useForm<RickshawForm, unknown, RickshawInput>({ resolver: zodResolver(rickshawSchema), defaultValues: EMPTY })
  const [step, setStep] = useState(editing ? 2 : 0)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [ownerDialog, setOwnerDialog] = useState(false)
  const [ownerIsDriver, setOwnerIsDriver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Returning from "Register a new driver" pre-selects that driver.
  const presetDriverId = Number(search.get('driverId')) || null
  const preset = useQuery({ queryKey: ['driver', presetDriverId], queryFn: () => driverApi.get(presetDriverId!), enabled: !!presetDriverId && !editing })
  useEffect(() => {
    if (preset.data) setDriver(preset.data)
  }, [preset.data])

  const existing = useQuery({ queryKey: ['rickshaw', Number(id)], queryFn: () => rickshawApi.get(Number(id)), enabled: editing })
  useEffect(() => {
    const r = existing.data
    if (!r) return
    setOwner(r.owner)
    form.reset({
      rickshawNumber: r.rickshawNumber, chassisNo: r.chassisNo ?? '', motorNo: r.motorNo ?? '', color: r.color ?? '', model: r.model ?? '',
      thana: r.thana, photoId: r.photoId, rearPhotoId: r.rearPhotoId, ownerId: r.owner.id, driverId: r.currentDriver?.id ?? 0,
    })
  }, [existing.data, form])

  const driverAsOwner = useMemo<OwnerForm | undefined>(
    () => (driver ? { fullName: driver.fullName, nid: driver.nid, mobile: driver.mobile, address: driver.permanentAddress } : undefined),
    [driver],
  )

  const next = async () => {
    setError(null)
    if (step === 0) {
      if (!driver) return setError('Choose the driver who drives this rickshaw.')
      if (driver.currentRickshaw) return setError(`${driver.fullName} already drives ${driver.currentRickshaw.rickshawNumber}. Reassign from that rickshaw's page instead.`)
      form.setValue('driverId', driver.id)
    }
    if (step === 1) {
      if (!owner) return setError('Choose the owner, or add a new one.')
      form.setValue('ownerId', owner.id)
    }
    if (step === 2) {
      const ok = await form.trigger(['rickshawNumber', 'thana', 'photoId', 'chassisNo', 'motorNo', 'color', 'model'])
      if (!ok) return
      if (editing) return void submit()
    }
    setStep((s) => s + 1)
  }

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      const saved = editing ? await rickshawApi.update(Number(id), values) : await rickshawApi.create(values)
      await qc.invalidateQueries({ queryKey: ['rickshaws'] })
      await qc.invalidateQueries({ queryKey: ['drivers'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.setQueryData(['rickshaw', saved.id], saved)
      navigate(`/rickshaws/${saved.id}`, { state: { justRegistered: !editing } })
    } catch (e) {
      const msg = applyServerErrors(form, apiError(e))
      setError(msg)
      if (Object.keys(form.formState.errors).length) setStep(2)
    }
  })

  const err = (n: string) => errorAt(form, n)
  const values = form.watch()

  return (
    <>
      <PageHeader
        title={editing ? 'Edit rickshaw' : 'Register rickshaw'}
        subtitle={editing ? existing.data?.rickshawNumber : 'Link the vehicle to its driver and owner, then add photos.'}
      />
      {!editing && (
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>
      )}
      <FormAlert message={error} />

      {step === 0 && (
        <Section title="Who drives this rickshaw?">
          <Stack spacing={2}>
            <DriverPicker value={driver} onChange={setDriver} />
            {driver && <DriverCard driver={driver} />}
            <Typography variant="body2" color="text.secondary">
              Driver not registered yet?{' '}
              <Button component={RouterLink} to="/drivers/new?returnTo=rickshaw" size="small">Register a new driver</Button>
            </Typography>
          </Stack>
        </Section>
      )}

      {step === 1 && (
        <Section title="Who owns it?">
          <Stack spacing={2}>
            <FormControlLabel
              control={<Checkbox checked={ownerIsDriver} onChange={(e) => { setOwnerIsDriver(e.target.checked); if (e.target.checked) setOwnerDialog(true) }} />}
              label="The driver owns this rickshaw"
            />
            <OwnerPicker value={owner} onChange={setOwner} />
            {owner && (
              <Alert severity="success" icon={false}>
                <strong>{owner.fullName}</strong> · NID <Mono>{owner.nid}</Mono> · <Mono>{owner.mobile}</Mono>
              </Alert>
            )}
            <Box>
              <Button variant="outlined" onClick={() => { setOwnerIsDriver(false); setOwnerDialog(true) }}>Add a new owner</Button>
            </Box>
          </Stack>
          <OwnerDialog
            open={ownerDialog}
            initial={ownerIsDriver ? driverAsOwner : undefined}
            onClose={() => setOwnerDialog(false)}
            onSaved={(o) => {
              setOwner(o)
              setOwnerDialog(false)
            }}
          />
        </Section>
      )}

      {step === 2 && (
        <Section title="Vehicle">
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Stack spacing={2}>
              <TextField
                label="Rickshaw number"
                {...form.register('rickshawNumber')}
                error={!!err('rickshawNumber')}
                helperText={err('rickshawNumber') ?? (editing ? 'Letters, digits and dashes.' : 'Leave blank and a DHK-AR number will be issued. Enter a number only if it already has one.')}
                slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
              />
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
                    renderInput={(p) => <TextField {...p} label="Operating thana" required error={!!err('thana')} helperText={err('thana') ?? 'Where it mostly operates.'} />}
                  />
                )}
              />
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                <TextField label="Colour" {...form.register('color')} error={!!err('color')} helperText={err('color')} />
                <TextField label="Make / model" {...form.register('model')} error={!!err('model')} helperText={err('model')} />
                <TextField label="Chassis number" {...form.register('chassisNo')} error={!!err('chassisNo')} helperText={err('chassisNo')} />
                <TextField label="Motor number" {...form.register('motorNo')} error={!!err('motorNo')} helperText={err('motorNo')} />
              </Box>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <Controller control={form.control} name="photoId" render={({ field }) => (
                <PhotoInput label="Side photo" hint="Whole vehicle in frame." required value={field.value || null} onChange={(v) => field.onChange(v ?? '')} error={err('photoId')} />
              )} />
              <Controller control={form.control} name="rearPhotoId" render={({ field }) => (
                <PhotoInput label="Rear photo" hint="Show any existing plate." value={field.value} onChange={field.onChange} />
              )} />
            </Stack>
          </Box>
        </Section>
      )}

      {step === 3 && driver && owner && (
        <Section title="Check before registering">
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'auto 1fr' }, alignItems: 'start' }}>
            <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Plate number={values.rickshawNumber?.trim() ? values.rickshawNumber.trim().toUpperCase() : 'DHK-AR-······'} size="lg" />
              <Stack direction="row" spacing={1}>
                <AuthImage id={values.photoId || null} alt="Side photo" size={140} ratio={4 / 3} />
                <AuthImage id={values.rearPhotoId} alt="Rear photo" size={140} ratio={4 / 3} />
              </Stack>
            </Stack>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
              <Field label="Driver">{driver.fullName} · <Mono>{driver.driverCode}</Mono></Field>
              <Field label="Owner">{owner.fullName}</Field>
              <Field label="Thana">{values.thana}</Field>
              <Field label="Colour">{values.color || '—'}</Field>
              <Field label="Make / model">{values.model || '—'}</Field>
              <Field label="Chassis / motor">{[values.chassisNo, values.motorNo].filter(Boolean).join(' / ') || '—'}</Field>
            </Box>
          </Box>
        </Section>
      )}

      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', mt: 2 }}>
        <Button onClick={() => (step === 0 || editing ? navigate(editing ? `/rickshaws/${id}` : '/rickshaws') : setStep((s) => s - 1))}>
          {step === 0 || editing ? 'Cancel' : 'Back'}
        </Button>
        {step < 3 ? (
          <Button variant="contained" onClick={() => void next()} disabled={form.formState.isSubmitting}>
            {editing ? 'Save changes' : 'Continue'}
          </Button>
        ) : (
          <Button variant="contained" size="large" onClick={() => void submit()} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Registering…' : 'Register rickshaw'}
          </Button>
        )}
      </Stack>
    </>
  )
}

function DriverCard({ driver }: { driver: Driver }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <AuthImage id={driver.photoId} alt="" size={64} ratio={3 / 4} />
      <Box>
        <Typography sx={{ fontWeight: 600 }}>{driver.fullName}</Typography>
        <Typography variant="body2" color="text.secondary">
          <Mono>{driver.driverCode}</Mono> · NID <Mono>{driver.nid}</Mono> · <Mono>{driver.mobile}</Mono>
        </Typography>
        {driver.currentRickshaw && (
          <Typography variant="body2" color="error">Already drives {driver.currentRickshaw.rickshawNumber}</Typography>
        )}
      </Box>
    </Stack>
  )
}
