import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { applyServerErrors, CField } from '../../components/FormFields'
import { OwnerPicker } from '../../components/OwnerPicker'
import { PhotoField } from '../../components/PhotoField'
import { Banner, Button, Card, Screen, SectionLabel, Title } from '../../components/ui'
import { ApiError, rickshawApi } from '../../lib/api'
import { rickshawSchema, type RickshawForm, type RickshawInput } from '../../lib/schemas'
import type { Owner } from '../../lib/types'

const EMPTY: RickshawForm = {
  rickshawNumber: '', chassisNo: '', motorNo: '', color: '', model: '', thana: '',
  photoId: '', rearPhotoId: null, ownerId: undefined as unknown as number,
}

/**
 * Camera-first rickshaw registration (FR-5, FR-12): photo, owner, details. Drivers are not linked to
 * rickshaws (PRD v1.2); a later owner change goes through an ownership transfer (FR-13).
 */
export default function RegisterRickshawScreen() {
  const qc = useQueryClient()
  const form = useForm<RickshawForm, unknown, RickshawInput>({ resolver: zodResolver(rickshawSchema), defaultValues: EMPTY })
  const [owner, setOwner] = useState<Owner | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  const submit = form.handleSubmit(
    async (values) => {
      setBanner(null)
      try {
        const r = await rickshawApi.create(values)
        await qc.invalidateQueries({ queryKey: ['rickshaws'] })
        router.replace({ pathname: '/rickshaws/[id]', params: { id: String(r.id), registered: '1' } })
      } catch (e) {
        if (e instanceof ApiError) {
          applyServerErrors(form.setError, e.fieldErrors)
          setBanner(e.fieldErrors.length ? 'Some fields need fixing. Check the highlighted fields.' : e.message)
        } else setBanner('Could not register. Try again.')
      }
    },
    (errors) => {
      if (errors.ownerId) setBanner('Choose or add the owner.')
      else setBanner('Some fields need fixing. Check the highlighted fields.')
    },
  )

  function register() {
    if (owner) form.setValue('ownerId', owner.id)
    void submit()
  }

  return (
    <Screen>
      <Title sub="Start with the photo, then choose or add the owner.">New rickshaw</Title>
      <Banner message={banner} />

      <Card>
        <SectionLabel>Photos</SectionLabel>
        <Controller control={form.control} name="photoId" render={({ field, fieldState }) => (
          <PhotoField label="Side photo" hint="Whole vehicle in frame." ratio={4 / 3} required value={field.value || null} onChange={(v) => field.onChange(v ?? '')} error={fieldState.error?.message} />
        )} />
        <Controller control={form.control} name="rearPhotoId" render={({ field }) => (
          <PhotoField label="Rear photo" hint="Show any existing plate." ratio={4 / 3} value={field.value} onChange={field.onChange} />
        )} />
      </Card>

      <Card>
        <SectionLabel>Owner</SectionLabel>
        <OwnerPicker owner={owner} onChange={setOwner} />
      </Card>

      <Card>
        <SectionLabel>Vehicle details</SectionLabel>
        <CField control={form.control} name="rickshawNumber" label="Rickshaw number" autoCapitalize="characters" hint="Leave blank and a DHK-AR number will be issued." />
        <CField control={form.control} name="thana" label="Operating thana" required autoCapitalize="words" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><CField control={form.control} name="color" label="Colour" /></View>
          <View style={{ flex: 1 }}><CField control={form.control} name="model" label="Make / model" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><CField control={form.control} name="chassisNo" label="Chassis no." autoCapitalize="characters" /></View>
          <View style={{ flex: 1 }}><CField control={form.control} name="motorNo" label="Motor no." autoCapitalize="characters" /></View>
        </View>
      </Card>

      <Button title={form.formState.isSubmitting ? 'Registering…' : 'Register rickshaw'} onPress={register} busy={form.formState.isSubmitting} />
    </Screen>
  )
}
