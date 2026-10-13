import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Autocomplete, Box, Button, Stack, Step, StepLabel, Stepper, TextField } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { rickshawApi } from '../api/endpoints'
import type { Owner } from '../api/types'
import { AuthImage } from '../components/AuthImage'
import { Field, Mono, PageHeader, Section } from '../components/common'
import { applyServerErrors, DHAKA_THANAS, errorAt, FormAlert } from '../components/forms'
import { OwnerDialog } from '../components/OwnerDialog'
import { OwnerPicker } from '../components/Pickers'
import { PhotoInput } from '../components/PhotoInput'
import { Plate } from '../components/Plate'
import { rickshawSchema, type RickshawForm, type RickshawInput } from '../schemas'

// The vehicle can't be registered without an owner. Drivers aren't linked to rickshaws (PRD v1.2).
const STEPS = ['Owner', 'Vehicle', 'Review']
const OWNER = 0
const VEHICLE = 1
const REVIEW = 2

const EMPTY: RickshawForm = {
  rickshawNumber: '', chassisNo: '', motorNo: '', color: '', model: '', thana: '',
  photoId: '', rearPhotoId: null, ownerId: undefined as unknown as number,
}

/** Register a rickshaw (FR-5) or, with an :id, edit its vehicle details. The owner changes by transfer (FR-13). */
export function RickshawWizardPage() {
  const { id } = useParams()
  const editing = id !== undefined
  const navigate = useNavigate()
  const qc = useQueryClient()

  const form = useForm<RickshawForm, unknown, RickshawInput>({ resolver: zodResolver(rickshawSchema), defaultValues: EMPTY })
  const [step, setStep] = useState(editing ? VEHICLE : OWNER)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [ownerDialog, setOwnerDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existing = useQuery({ queryKey: ['rickshaw', Number(id)], queryFn: () => rickshawApi.get(Number(id)), enabled: editing })
  useEffect(() => {
    const r = existing.data
    if (!r) return
    setOwner(r.owner)
    form.reset({
      rickshawNumber: r.rickshawNumber, chassisNo: r.chassisNo ?? '', motorNo: r.motorNo ?? '', color: r.color ?? '', model: r.model ?? '',
      thana: r.thana, photoId: r.photoId, rearPhotoId: r.rearPhotoId, ownerId: r.owner.id,
    })
  }, [existing.data, form])

  const next = async () => {
    setError(null)
    if (step === OWNER) {
      if (!owner) return setError('Choose the owner, or add a new one.')
      form.setValue('ownerId', owner.id)
    }
    if (step === VEHICLE) {
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
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.setQueryData(['rickshaw', saved.id], saved)
      navigate(`/rickshaws/${saved.id}`, { state: { justRegistered: !editing } })
    } catch (e) {
      const msg = applyServerErrors(form, apiError(e))
      setError(msg)
      if (Object.keys(form.formState.errors).length) setStep(VEHICLE)
    }
  })

  const err = (n: string) => errorAt(form, n)
  const values = form.watch()

  return (
    <>
      <PageHeader
        title={editing ? 'Edit rickshaw' : 'Register rickshaw'}
        subtitle={editing ? existing.data?.rickshawNumber : 'Record who owns the vehicle, then add its details and photos.'}
      />
      {!editing && (
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>
      )}
      <FormAlert message={error} />

      {step === OWNER && (
        <Section title="Who owns it?">
          <Stack spacing={2}>
            <OwnerPicker value={owner} onChange={setOwner} />
            {owner && (
              <Alert severity="success" icon={false}>
                <strong>{owner.fullName}</strong> · NID <Mono>{owner.nid}</Mono> · <Mono>{owner.mobile}</Mono>
              </Alert>
            )}
            <Box>
              <Button variant="outlined" onClick={() => setOwnerDialog(true)}>Add a new owner</Button>
            </Box>
          </Stack>
          <OwnerDialog
            open={ownerDialog}
            onClose={() => setOwnerDialog(false)}
            onSaved={(o) => {
              setOwner(o)
              setOwnerDialog(false)
            }}
          />
        </Section>
      )}

      {step === VEHICLE && (
        <Section title="Vehicle">
          {editing && (
            <Alert severity="info" sx={{ mb: 2 }}>
              To change the owner, use <strong>Change owner</strong> on the rickshaw's page so the ownership history is kept.
            </Alert>
          )}
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

      {step === REVIEW && owner && (
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
              <Field label="Owner">{owner.fullName} · <Mono>{owner.mobile}</Mono></Field>
              <Field label="Thana">{values.thana}</Field>
              <Field label="Colour">{values.color || '—'}</Field>
              <Field label="Make / model">{values.model || '—'}</Field>
              <Field label="Chassis / motor">{[values.chassisNo, values.motorNo].filter(Boolean).join(' / ') || '—'}</Field>
            </Box>
          </Box>
        </Section>
      )}

      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', mt: 2 }}>
        <Button onClick={() => (step === OWNER || editing ? navigate(editing ? `/rickshaws/${id}` : '/rickshaws') : setStep((s) => s - 1))}>
          {step === OWNER || editing ? 'Cancel' : 'Back'}
        </Button>
        {step < REVIEW ? (
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
