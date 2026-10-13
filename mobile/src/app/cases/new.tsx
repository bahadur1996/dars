import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { applyServerErrors, CField } from '../../components/FormFields'
import { PhotoField } from '../../components/PhotoField'
import { DriverPicker, RickshawPicker } from '../../components/Pickers'
import { Banner, Button, Card, Field, Screen, SectionLabel, Title } from '../../components/ui'
import { ApiError, caseApi, driverApi, rickshawApi } from '../../lib/api'
import { dhakaNowLocal } from '../../lib/datetime'
import { caseSchema, type CaseForm, type CaseInput } from '../../lib/schemas'
import type { Driver, Rickshaw } from '../../lib/types'

const EVIDENCE_SLOTS = 3

/**
 * Files a case in the field (FR-15). `?rickshawId=` / `?driverId=` preselect a target. Escalating a complaint
 * into a case stays in the web app, where complaints are handled.
 */
export default function FileCaseScreen() {
  const params = useLocalSearchParams<{ rickshawId?: string; driverId?: string }>()
  const presetRickshawId = Number(params.rickshawId) || null
  const presetDriverId = Number(params.driverId) || null
  const qc = useQueryClient()
  const form = useForm<CaseForm, unknown, CaseInput>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      rickshawId: null, driverId: null, complaintId: null, offence: '', description: '',
      incidentAt: dhakaNowLocal(), thana: '', evidencePhotoIds: [],
    },
  })
  // undefined = not touched yet, so the preselected record (if any) is shown.
  const [rickshawPick, setRickshaw] = useState<Rickshaw | null | undefined>(undefined)
  const [driverPick, setDriver] = useState<Driver | null | undefined>(undefined)
  const [evidence, setEvidence] = useState<(string | null)[]>(Array(EVIDENCE_SLOTS).fill(null))
  const [banner, setBanner] = useState<string | null>(null)

  const presetRickshaw = useQuery({ queryKey: ['rickshaw', presetRickshawId], queryFn: () => rickshawApi.get(presetRickshawId!), enabled: !!presetRickshawId })
  const presetDriver = useQuery({ queryKey: ['driver', presetDriverId], queryFn: () => driverApi.get(presetDriverId!), enabled: !!presetDriverId })
  const rickshaw = rickshawPick === undefined ? presetRickshaw.data ?? null : rickshawPick
  const driver = driverPick === undefined ? presetDriver.data ?? null : driverPick
  useEffect(() => {
    const r = presetRickshaw.data
    if (r && !form.getValues('thana')) form.setValue('thana', r.thana)
  }, [presetRickshaw.data, form])

  const submit = form.handleSubmit(
    async (values) => {
      setBanner(null)
      try {
        const saved = await caseApi.create(values)
        await qc.invalidateQueries({ queryKey: ['rickshaw'] })
        await qc.invalidateQueries({ queryKey: ['driver'] })
        qc.setQueryData(['case', saved.id], saved)
        router.replace({ pathname: '/cases/[id]', params: { id: String(saved.id), filed: '1' } })
      } catch (e) {
        if (e instanceof ApiError) {
          applyServerErrors(form.setError, e.fieldErrors)
          setBanner(e.fieldErrors.length ? 'Some fields need fixing. Check the highlighted fields.' : e.message)
        } else setBanner('Could not file the case. Try again.')
      }
    },
    (errors) => setBanner(errors.rickshawId ? 'Choose a rickshaw, a driver, or both.' : 'Some fields need fixing. Check the highlighted fields.'),
  )

  function file() {
    form.setValue('rickshawId', rickshaw?.id ?? null)
    form.setValue('driverId', driver?.id ?? null)
    form.setValue('evidencePhotoIds', evidence.filter((x): x is string => !!x))
    void submit()
  }

  const targetError = form.formState.errors.rickshawId?.message
  return (
    <Screen>
      <Title sub="A case can name a rickshaw, a driver, or both.">File a case</Title>
      <Banner message={banner} />

      <Card>
        <SectionLabel>Against</SectionLabel>
        <RickshawPicker value={rickshaw} onChange={setRickshaw} error={targetError} />
        <DriverPicker value={driver} onChange={setDriver} />
      </Card>

      <Card>
        <SectionLabel>Details</SectionLabel>
        <CField control={form.control} name="offence" label="Offence" required maxLength={200} hint='Short summary, e.g. "Overcharging passengers".' />
        <CField control={form.control} name="description" label="Description" required multiline numberOfLines={4} maxLength={2000} style={{ minHeight: 96, textAlignVertical: 'top' }} />
        <Controller control={form.control} name="incidentAt" render={({ field, fieldState }) => (
          // Stored as YYYY-MM-DDTHH:mm (Dhaka time); shown with a space, which is easier to type.
          <Field
            label="When it happened"
            required
            value={field.value.replace('T', ' ')}
            onChangeText={(t) => field.onChange(t.trim().replace(' ', 'T'))}
            placeholder="2026-10-13 14:30"
            autoCorrect={false}
            hint="Dhaka time, YYYY-MM-DD HH:MM."
            error={fieldState.error?.message}
          />
        )} />
        <CField control={form.control} name="thana" label="Thana" required autoCapitalize="words" maxLength={50} />
      </Card>

      <Card>
        <SectionLabel>Evidence photos</SectionLabel>
        {evidence.map((v, i) => (
          <PhotoField key={i} label={`Photo ${i + 1}`} hint="Optional." ratio={4 / 3} value={v}
            onChange={(id) => setEvidence((prev) => prev.map((x, j) => (j === i ? id : x)))} />
        ))}
      </Card>

      <View style={{ gap: 4 }}>
        <Button title={form.formState.isSubmitting ? 'Filing…' : 'File case'} onPress={file} busy={form.formState.isSubmitting} />
        <Button title="Cancel" kind="text" onPress={() => router.back()} />
      </View>
    </Screen>
  )
}
