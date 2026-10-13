import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { driverApi, rickshawApi } from '../lib/api'
import type { Driver, Rickshaw } from '../lib/types'
import { useDebounced } from '../lib/useDebounced'
import { AuthImage } from './AuthImage'
import { colors, fonts } from './theme'
import { Button, Field, Mono, Muted, Plate, StatusBadge } from './ui'

/** Search-as-you-type list; shows the chosen item with a "change" link once one is picked. */
function SearchPicker<T extends { id: number }>({ label, placeholder, value, onChange, search, renderItem, error, empty }: {
  label: string
  placeholder: string
  value: T | null
  onChange: (v: T | null) => void
  search: (term: string) => Promise<T[]>
  renderItem: (v: T) => ReactNode
  error?: string
  empty: string
}) {
  const [q, setQ] = useState('')
  const term = useDebounced(q.trim())
  const results = useQuery({ queryKey: ['pick', label, term], queryFn: () => search(term), enabled: !value && term.length >= 3 })

  if (value) {
    return (
      <View style={{ marginBottom: 12 }}>
        {renderItem(value)}
        <Button title={`Change ${label.toLowerCase()}`} kind="text" onPress={() => onChange(null)} />
      </View>
    )
  }
  return (
    <View style={{ marginBottom: 12 }}>
      <Field label={label} value={q} onChangeText={setQ} placeholder={placeholder} autoCapitalize="characters" autoCorrect={false} hint="Type at least 3 characters." error={error} />
      {results.data?.map((v) => (
        <Pressable key={v.id} accessibilityRole="button" onPress={() => onChange(v)} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: colors.rule }}>
          {renderItem(v)}
        </Pressable>
      ))}
      {term.length >= 3 && results.data?.length === 0 ? <Muted>{empty}</Muted> : null}
    </View>
  )
}

export function RickshawPicker({ value, onChange, error }: { value: Rickshaw | null; onChange: (r: Rickshaw | null) => void; error?: string }) {
  return (
    <SearchPicker
      label="Rickshaw"
      placeholder="Number, or owner NID or mobile"
      value={value}
      onChange={onChange}
      error={error}
      empty="No registered rickshaw matches."
      search={(q) => rickshawApi.search({ q, size: 6 }).then((p) => p.content)}
      renderItem={(r) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Plate number={r.rickshawNumber} size="sm" />
          <Muted style={{ flex: 1 }}>{r.owner.fullName} · {r.thana}</Muted>
          <StatusBadge status={r.status} />
        </View>
      )}
    />
  )
}

/** Suspended and blacklisted drivers stay selectable: a case may well be against one. */
export function DriverPicker({ value, onChange }: { value: Driver | null; onChange: (d: Driver | null) => void }) {
  return (
    <SearchPicker
      label="Driver"
      placeholder="Name, driver code, NID or mobile"
      value={value}
      onChange={onChange}
      empty="No registered driver matches."
      search={(q) => driverApi.search({ q, size: 6 }).then((p) => p.content)}
      renderItem={(d) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AuthImage id={d.photoId} width={40} ratio={3 / 4} label={d.fullName} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{d.fullName}</Text>
            <Mono>{d.driverCode}</Mono>
          </View>
          <StatusBadge status={d.status} />
        </View>
      )}
    />
  )
}
