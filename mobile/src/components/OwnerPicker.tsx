import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pressable, Text, View } from 'react-native'
import { ApiError, ownerApi } from '../lib/api'
import { ownerSchema, type OwnerForm, type OwnerInput } from '../lib/schemas'
import type { Owner } from '../lib/types'
import { useDebounced } from '../lib/useDebounced'
import { applyServerErrors, CField } from './FormFields'
import { colors, fonts } from './theme'
import { Banner, Button, Chips, Field, Muted } from './ui'

const OWNER_EMPTY: OwnerForm = { fullName: '', nid: '', mobile: '', address: { division: 'Dhaka', district: 'Dhaka', thana: '', line: '' } }

/** Pick a registered owner or add a new one. Also used by the ownership transfer on the rickshaw screen. */
export function OwnerPicker({ owner, onChange }: { owner: Owner | null; onChange: (o: Owner | null) => void }) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [q, setQ] = useState('')
  const term = useDebounced(q.trim())
  const results = useQuery({ queryKey: ['owners', 'pick', term], queryFn: () => ownerApi.search({ q: term, size: 5 }), enabled: mode === 'existing' && term.length >= 3 })
  const form = useForm<OwnerForm, unknown, OwnerInput>({ resolver: zodResolver(ownerSchema), defaultValues: OWNER_EMPTY })
  const [error, setError] = useState<string | null>(null)

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
        options={[{ value: 'existing', label: 'Existing owner' }, { value: 'new', label: 'New owner' }]} />
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
