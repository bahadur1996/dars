import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { View } from 'react-native'
import { applyServerErrors, CField } from '../../components/FormFields'
import { PhotoField } from '../../components/PhotoField'
import { Banner, Button, Card, Chips, Screen, SectionLabel, Title } from '../../components/ui'
import { ApiError, driverApi } from '../../lib/api'
import { driverHandoff } from '../../lib/handoff'
import { BLOOD_GROUPS, driverSchema, PATTERNS, type DriverForm, type DriverInput } from '../../lib/schemas'

const ADDRESS = { division: 'Dhaka', district: 'Dhaka', thana: '', line: '' }
const EMPTY: DriverForm = {
  fullName: '', fatherName: '', dateOfBirth: '', gender: 'MALE', nid: '', licenceNo: '', mobile: '',
  presentAddress: ADDRESS, permanentAddress: ADDRESS, bloodGroup: '', emergencyName: '', emergencyPhone: '',
  photoId: '', nidFrontId: null, nidBackId: null,
}

/** Driver registration form with identification details (FR-3), camera-first. */
export default function RegisterDriverScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>()
  const qc = useQueryClient()
  const { control, handleSubmit, setValue, getValues, setError, formState } = useForm<DriverForm, unknown, DriverInput>({
    resolver: zodResolver(driverSchema),
    defaultValues: EMPTY,
  })
  const [sameAddress, setSameAddress] = useState(true)
  const [banner, setBanner] = useState<string | null>(null)

  const nid = useWatch({ control, name: 'nid' })
  const nidCheck = useQuery({ queryKey: ['check-nid', nid], queryFn: () => driverApi.checkNid(nid), enabled: PATTERNS.nid.test(nid ?? '') })
  const duplicate = nidCheck.data?.exists ? nidCheck.data.driver : null

  const save = handleSubmit(
    async (values) => {
      setBanner(null)
      try {
        const d = await driverApi.create(values)
        await qc.invalidateQueries({ queryKey: ['drivers'] })
        if (returnTo === 'rickshaw') {
          driverHandoff.put(d.id)
          router.back()
        } else router.replace(`/drivers/${d.id}`)
      } catch (e) {
        if (e instanceof ApiError) {
          applyServerErrors(setError, e.fieldErrors)
          setBanner(e.fieldErrors.length ? 'Some fields need fixing. Check the highlighted fields.' : e.message)
        } else setBanner('Could not save. Try again.')
      }
    },
    () => setBanner('Some fields need fixing. Check the highlighted fields.'),
  )

  function submit() {
    if (sameAddress) setValue('permanentAddress', getValues('presentAddress'))
    void save()
  }

  const address = (prefix: 'presentAddress' | 'permanentAddress') => (
    <>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><CField control={control} name={`${prefix}.division`} label="Division" required /></View>
        <View style={{ flex: 1 }}><CField control={control} name={`${prefix}.district`} label="District" required /></View>
      </View>
      <CField control={control} name={`${prefix}.thana`} label="Thana / upazila" required />
      <CField control={control} name={`${prefix}.line`} label="House, road, area" required />
    </>
  )

  return (
    <Screen>
      <Title sub="A driver code is issued when you save.">New driver</Title>
      <Banner message={banner} />

      <Card>
        <SectionLabel>Photo</SectionLabel>
        <Controller control={control} name="photoId" render={({ field, fieldState }) => (
          <PhotoField label="Driver photo" hint="Face clearly visible, no sunglasses." required value={field.value || null} onChange={(v) => field.onChange(v ?? '')} error={fieldState.error?.message} />
        )} />
      </Card>

      <Card>
        <SectionLabel>Identity</SectionLabel>
        <CField control={control} name="fullName" label="Full name (as on NID)" required autoCapitalize="words" />
        <CField control={control} name="fatherName" label="Father's or husband's name" required autoCapitalize="words" />
        <CField
          control={control}
          name="nid"
          label="NID number"
          required
          keyboardType="number-pad"
          hint={duplicate ? `Already registered as ${duplicate.driverCode} (${duplicate.fullName})` : '10 or 17 digits'}
        />
        {duplicate ? <Banner message={`This NID belongs to ${duplicate.fullName}, ${duplicate.driverCode}. Open that driver instead of registering again.`} /> : null}
        <CField control={control} name="dateOfBirth" label="Date of birth" required placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} />
        <Controller control={control} name="gender" render={({ field, fieldState }) => (
          <Chips label="Gender" required value={field.value} onChange={field.onChange} error={fieldState.error?.message}
            options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} />
        )} />
        <CField control={control} name="mobile" label="Mobile number" required keyboardType="phone-pad" placeholder="01XXXXXXXXX" maxLength={11} />
        <CField control={control} name="licenceNo" label="Driving licence number" hint="Leave blank if the driver has none." autoCapitalize="characters" />
        <Controller control={control} name="bloodGroup" render={({ field }) => (
          <Chips label="Blood group" value={field.value ?? ''} onChange={(v) => field.onChange(v === field.value ? '' : v)}
            options={BLOOD_GROUPS.map((b) => ({ value: b, label: b }))} />
        )} />
      </Card>

      <Card>
        <SectionLabel>Present address</SectionLabel>
        {address('presentAddress')}
        <Chips label="Permanent address" value={sameAddress ? 'same' : 'different'} onChange={(v) => setSameAddress(v === 'same')}
          options={[{ value: 'same', label: 'Same as present' }, { value: 'different', label: 'Different' }]} />
        {!sameAddress ? address('permanentAddress') : null}
      </Card>

      <Card>
        <SectionLabel>NID card and emergency contact</SectionLabel>
        <Controller control={control} name="nidFrontId" render={({ field }) => (
          <PhotoField label="NID card, front" ratio={1.6} value={field.value} onChange={field.onChange} />
        )} />
        <Controller control={control} name="nidBackId" render={({ field }) => (
          <PhotoField label="NID card, back" ratio={1.6} value={field.value} onChange={field.onChange} />
        )} />
        <CField control={control} name="emergencyName" label="Emergency contact name" />
        <CField control={control} name="emergencyPhone" label="Emergency contact mobile" keyboardType="phone-pad" maxLength={11} />
      </Card>

      <Button title={formState.isSubmitting ? 'Saving…' : 'Register driver'} onPress={submit} busy={formState.isSubmitting} disabled={!!duplicate} />
    </Screen>
  )
}
