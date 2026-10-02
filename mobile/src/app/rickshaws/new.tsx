import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, Text, View } from 'react-native'
import { AuthImage } from '../../components/AuthImage'
import { applyServerErrors, CField } from '../../components/FormFields'
import { PhotoField } from '../../components/PhotoField'
import { colors, fonts } from '../../components/theme'
import { Banner, Button, Card, Chips, Field, Mono, Muted, Screen, SectionLabel, Title } from '../../components/ui'
import { ApiError, driverApi, ownerApi, rickshawApi } from '../../lib/api'
import { driverHandoff } from '../../lib/handoff'
import { ownerSchema, rickshawSchema, type OwnerForm, type OwnerInput, type RickshawForm, type RickshawInput } from '../../lib/schemas'
import type { Driver, Owner } from '../../lib/types'

const EMPTY: RickshawForm = {
  rickshawNumber: '', chassisNo: '', motorNo: '', color: '', model: '', thana: '',
  photoId: '', rearPhotoId: null, ownerId: undefined as unknown as number, driverId: undefined as unknown as number,
}

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

/** Camera-first rickshaw registration (FR-5, FR-12): photo, driver, owner, details. */
export default function RegisterRickshawScreen() {
  const qc = useQueryClient()
  const form = useForm<RickshawForm, unknown, RickshawInput>({ resolver: zodResolver(rickshawSchema), defaultValues: EMPTY })
  const [driver, setDriver] = useState<Driver | null>(null)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  // Pick up a driver registered from this screen.
  useFocusEffect(
    useCallback(() => {
      const id = driverHandoff.take()
      if (id) void driverApi.get(id).then(setDriver)
    }, []),
  )

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
      if (errors.driverId) setBanner('Choose the driver.')
      else if (errors.ownerId) setBanner('Choose or add the owner.')
      else setBanner('Some fields need fixing. Check the highlighted fields.')
    },
  )

  function register() {
    if (driver) form.setValue('driverId', driver.id)
    if (owner) form.setValue('ownerId', owner.id)
    void submit()
  }

  return (
    <Screen>
      <Title sub="Start with the photo, then link the driver and owner.">New rickshaw</Title>
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
        <SectionLabel>Driver</SectionLabel>
        <DriverStep driver={driver} onChange={setDriver} />
      </Card>

      <Card>
        <SectionLabel>Owner</SectionLabel>
        <OwnerStep driver={driver} owner={owner} onChange={setOwner} />
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

function DriverStep({ driver, onChange }: { driver: Driver | null; onChange: (d: Driver | null) => void }) {
  const [q, setQ] = useState('')
  const term = useDebounced(q.trim())
  const results = useQuery({ queryKey: ['drivers', 'pick', term], queryFn: () => driverApi.search({ q: term, size: 6 }), enabled: term.length >= 3 })

  if (driver) {
    return (
      <View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <AuthImage id={driver.photoId} width={56} ratio={3 / 4} label={driver.fullName} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink }}>{driver.fullName}</Text>
            <Mono>{driver.driverCode}</Mono>
            <Muted>NID {driver.nid}</Muted>
          </View>
        </View>
        {driver.currentRickshaw ? <Banner message={`Already drives ${driver.currentRickshaw.rickshawNumber}. Choose another driver.`} /> : null}
        <Button title="Choose a different driver" kind="text" onPress={() => onChange(null)} />
      </View>
    )
  }
  return (
    <View>
      <Field label="Search drivers" value={q} onChangeText={setQ} placeholder="Name, DRV code, NID or mobile" autoCorrect={false} hint="Type at least 3 characters." />
      {results.data?.content.map((d) => {
        const unavailable = d.status !== 'ACTIVE' || !!d.currentRickshaw
        return (
          <Pressable key={d.id} accessibilityRole="button" disabled={unavailable} onPress={() => onChange(d)}
            style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderColor: colors.rule, opacity: unavailable ? 0.5 : 1 }}>
            <AuthImage id={d.photoId} width={40} label={d.fullName} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{d.fullName}</Text>
              <Muted>{d.driverCode}{d.currentRickshaw ? ` · drives ${d.currentRickshaw.rickshawNumber}` : ''}{d.status !== 'ACTIVE' ? ` · ${d.status.toLowerCase()}` : ''}</Muted>
            </View>
          </Pressable>
        )
      })}
      {term.length >= 3 && results.data?.content.length === 0 ? <Muted>No driver matches. Register them below.</Muted> : null}
      <View style={{ marginTop: 8 }}>
        <Button title="Register a new driver" kind="outline" onPress={() => router.push({ pathname: '/drivers/new', params: { returnTo: 'rickshaw' } })} />
      </View>
    </View>
  )
}

const OWNER_EMPTY: OwnerForm = { fullName: '', nid: '', mobile: '', address: { division: 'Dhaka', district: 'Dhaka', thana: '', line: '' } }

function OwnerStep({ driver, owner, onChange }: { driver: Driver | null; owner: Owner | null; onChange: (o: Owner | null) => void }) {
  const [mode, setMode] = useState<'driver' | 'existing' | 'new'>('existing')
  const [q, setQ] = useState('')
  const term = useDebounced(q.trim())
  const results = useQuery({ queryKey: ['owners', 'pick', term], queryFn: () => ownerApi.search({ q: term, size: 5 }), enabled: mode === 'existing' && term.length >= 3 })
  const form = useForm<OwnerForm, unknown, OwnerInput>({ resolver: zodResolver(ownerSchema), defaultValues: OWNER_EMPTY })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function makeDriverTheOwner() {
    if (!driver) return setError('Choose the driver first.')
    setBusy(true)
    setError(null)
    try {
      // Reuse an existing owner record with the same NID, otherwise create one from the driver's details.
      const found = await ownerApi.search({ q: driver.nid, size: 1 })
      const existing = found.content.find((o) => o.nid === driver.nid)
      onChange(existing ?? (await ownerApi.create({ fullName: driver.fullName, nid: driver.nid, mobile: driver.mobile, address: driver.permanentAddress })))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the owner.')
    } finally {
      setBusy(false)
    }
  }

  const createOwner = form.handleSubmit(async (values) => {
    setError(null)
    try {
      onChange(await ownerApi.create(values))
    } catch (e) {
      if (e instanceof ApiError) {
        applyServerErrors(form.setError, e.fieldErrors)
        setError(e.message)
      }
    }
  })

  if (owner) {
    return (
      <View>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink }}>{owner.fullName}</Text>
        <Muted>NID {owner.nid} · {owner.mobile}</Muted>
        <Button title="Choose a different owner" kind="text" onPress={() => onChange(null)} />
      </View>
    )
  }
  return (
    <View>
      <Banner message={error} />
      <Chips label="Who owns it?" value={mode} onChange={setMode}
        options={[{ value: 'driver', label: 'The driver' }, { value: 'existing', label: 'Existing owner' }, { value: 'new', label: 'New owner' }]} />
      {mode === 'driver' ? (
        <Button title={driver ? `Use ${driver.fullName} as owner` : 'Choose the driver first'} kind="outline" onPress={() => void makeDriverTheOwner()} busy={busy} disabled={!driver} />
      ) : null}
      {mode === 'existing' ? (
        <View>
          <Field label="Search owners" value={q} onChangeText={setQ} placeholder="Name, NID or mobile" hint="Type at least 3 characters." />
          {results.data?.content.map((o) => (
            <Pressable key={o.id} accessibilityRole="button" onPress={() => onChange(o)} style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: colors.rule }}>
              <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{o.fullName}</Text>
              <Muted>NID {o.nid} · {o.mobile}</Muted>
            </Pressable>
          ))}
          {term.length >= 3 && results.data?.content.length === 0 ? <Muted>No owner matches. Choose “New owner”.</Muted> : null}
        </View>
      ) : null}
      {mode === 'new' ? (
        <View>
          <CField control={form.control} name="fullName" label="Owner's full name" required autoCapitalize="words" />
          <CField control={form.control} name="nid" label="NID number" required keyboardType="number-pad" />
          <CField control={form.control} name="mobile" label="Mobile" required keyboardType="phone-pad" maxLength={11} />
          <CField control={form.control} name="address.thana" label="Thana / upazila" required />
          <CField control={form.control} name="address.line" label="House, road, area" required />
          <Button title="Add owner" kind="outline" onPress={() => void createOwner()} busy={form.formState.isSubmitting} />
        </View>
      ) : null}
    </View>
  )
}
