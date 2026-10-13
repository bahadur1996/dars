import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Autocomplete, Box, Button, Stack, TextField } from '@mui/material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiError } from '../api/client'
import { caseApi, complaintApi, driverApi, rickshawApi } from '../api/endpoints'
import type { Driver, Rickshaw } from '../api/types'
import { Mono, PageHeader, Section } from '../components/common'
import { applyServerErrors, DHAKA_THANAS, errorAt, FormAlert } from '../components/forms'
import { DriverPicker, RickshawPicker } from '../components/Pickers'
import { PhotoInput } from '../components/PhotoInput'
import { caseSchema, type CaseForm, type CaseInput } from '../schemas'

const EMPTY: CaseForm = {
  rickshawId: null, driverId: null, complaintId: null, offence: '', description: '', incidentAt: '', thana: '',
  evidencePhotoIds: [],
}

const EVIDENCE_SLOTS = 3

/**
 * Files a case (FR-15). `?rickshawId=`, `?driverId=` preselect a target; `?complaintId=` escalates that complaint,
 * and the backend takes the rickshaw and driver from it.
 */
export function CaseFormPage() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const complaintId = Number(search.get('complaintId')) || null
  const presetRickshawId = Number(search.get('rickshawId')) || null
  const presetDriverId = Number(search.get('driverId')) || null

  const form = useForm<CaseForm, unknown, CaseInput>({ resolver: zodResolver(caseSchema), defaultValues: { ...EMPTY, complaintId } })
  const [rickshaw, setRickshaw] = useState<Rickshaw | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [evidence, setEvidence] = useState<(string | null)[]>(Array(EVIDENCE_SLOTS).fill(null))
  const [error, setError] = useState<string | null>(null)

  const complaint = useQuery({ queryKey: ['complaint', complaintId], queryFn: () => complaintApi.get(complaintId!), enabled: !!complaintId })
  const presetRickshaw = useQuery({ queryKey: ['rickshaw', presetRickshawId], queryFn: () => rickshawApi.get(presetRickshawId!), enabled: !!presetRickshawId })
  const presetDriver = useQuery({ queryKey: ['driver', presetDriverId], queryFn: () => driverApi.get(presetDriverId!), enabled: !!presetDriverId })
  useEffect(() => {
    if (presetRickshaw.data) setRickshaw(presetRickshaw.data)
  }, [presetRickshaw.data])
  useEffect(() => {
    if (presetDriver.data) setDriver(presetDriver.data)
  }, [presetDriver.data])
  useEffect(() => {
    const c = complaint.data
    if (!c) return
    form.setValue('thana', c.thana ?? form.getValues('thana'))
    if (!form.getValues('description')) form.setValue('description', c.description)
  }, [complaint.data, form])

  useEffect(() => {
    form.setValue('rickshawId', rickshaw?.id ?? null)
    form.setValue('driverId', driver?.id ?? null)
  }, [rickshaw, driver, form])

  const submit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      const saved = await caseApi.create(values)
      await qc.invalidateQueries({ queryKey: ['cases'] })
      await qc.invalidateQueries({ queryKey: ['complaints'] })
      await qc.invalidateQueries({ queryKey: ['complaint'] })
      await qc.invalidateQueries({ queryKey: ['rickshaw'] })
      await qc.invalidateQueries({ queryKey: ['driver'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.setQueryData(['case', saved.id], saved)
      navigate(`/cases/${saved.id}`)
    } catch (e) {
      setError(applyServerErrors(form, apiError(e)))
    }
  }, () => setError('Some fields need fixing. Check the highlighted fields.'))

  const err = (n: string) => errorAt(form, n)
  const setSlot = (i: number, v: string | null) => {
    const next = evidence.map((x, j) => (j === i ? v : x))
    setEvidence(next)
    form.setValue('evidencePhotoIds', next.filter((x): x is string => !!x))
  }

  const c = complaint.data
  return (
    <>
      <PageHeader title="File a case" subtitle="A case can name a rickshaw, a driver, or both." />
      <FormAlert message={error} />
      <Box component="form" onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <Stack spacing={2}>
          <Section title="Against">
            {complaintId ? (
              c ? (
                <Alert severity="info" icon={false}>
                  Escalating complaint <Mono>{c.complaintNo}</Mono> against rickshaw <Mono>{c.rickshaw.rickshawNumber}</Mono> and
                  driver {c.driver.fullName} (<Mono>{c.driver.driverCode}</Mono>). The complaint will be marked escalated.
                </Alert>
              ) : (
                <Alert severity="info" icon={false}>Loading the complaint…</Alert>
              )
            ) : (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                <RickshawPicker value={rickshaw} onChange={setRickshaw} error={err('rickshawId')} />
                <DriverPicker value={driver} onChange={setDriver} required={false} allowInactive />
              </Box>
            )}
          </Section>
          <Section title="Details">
            <Stack spacing={2}>
              <TextField label="Offence" required {...form.register('offence')} error={!!err('offence')} helperText={err('offence') ?? 'Short summary, e.g. "Overcharging passengers".'} slotProps={{ htmlInput: { maxLength: 200 } }} />
              <TextField label="Description" required multiline minRows={4} {...form.register('description')} error={!!err('description')} helperText={err('description')} slotProps={{ htmlInput: { maxLength: 2000 } }} />
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <TextField
                  type="datetime-local"
                  label="When it happened"
                  required
                  {...form.register('incidentAt')}
                  error={!!err('incidentAt')}
                  helperText={err('incidentAt') ?? 'Dhaka time.'}
                  slotProps={{ inputLabel: { shrink: true } }}
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
                      renderInput={(p) => <TextField {...p} label="Thana" required error={!!err('thana')} helperText={err('thana')} />}
                    />
                  )}
                />
              </Box>
            </Stack>
          </Section>
          <Section title="Evidence photos">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {evidence.map((v, i) => (
                <PhotoInput key={i} label={`Photo ${i + 1}`} hint="Optional." value={v} onChange={(id) => setSlot(i, id)} />
              ))}
            </Box>
          </Section>
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
            <Button onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" variant="contained" size="large" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Filing…' : 'File case'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </>
  )
}
