import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { AuthImage } from '../components/AuthImage'
import { colors, fonts } from '../components/theme'
import { Banner, Button, Card, Chips, Field, Muted, Plate, Screen, StatusBadge } from '../components/ui'
import { driverApi, rickshawApi } from '../lib/api'

type Kind = 'rickshaw' | 'driver'

const LABEL: Record<Kind, string> = {
  rickshaw: 'Number, or owner NID or mobile',
  driver: 'Name, driver code, NID or mobile',
}

/** Look up a rickshaw (by number or its current owner's NID/mobile) or a driver. */
export default function SearchScreen() {
  const [kind, setKind] = useState<Kind>('rickshaw')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const rickshaws = useQuery({ queryKey: ['rickshaws', 'search', q], queryFn: () => rickshawApi.search({ q, size: 20 }), enabled: kind === 'rickshaw' && q.length > 0 })
  const drivers = useQuery({ queryKey: ['drivers', 'search', q], queryFn: () => driverApi.search({ q, size: 20 }), enabled: kind === 'driver' && q.length > 0 })
  const active = kind === 'rickshaw' ? rickshaws : drivers

  return (
    <Screen>
      <Chips label="Find" value={kind} onChange={setKind} options={[{ value: 'rickshaw', label: 'Rickshaws' }, { value: 'driver', label: 'Drivers' }]} />
      <Field label={LABEL[kind]} value={input} onChangeText={setInput} autoCapitalize="characters" autoCorrect={false} returnKeyType="search" onSubmitEditing={() => setQ(input.trim())} placeholder={kind === 'rickshaw' ? 'DHK-AR-000123' : 'DRV-2026-000123'} />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1 }}><Button title="Search" onPress={() => setQ(input.trim())} disabled={!input.trim()} /></View>
        <View style={{ flex: 1 }}><Button title="Scan card" kind="outline" onPress={() => router.push('/scan')} /></View>
      </View>
      {active.isFetching ? <ActivityIndicator color={colors.plate} /> : null}
      <Banner message={active.error?.message} />
      {active.data?.totalElements === 0
        ? <Muted>{kind === 'rickshaw' ? `No registered rickshaw matches “${q}”. It may be unregistered.` : `No registered driver matches “${q}”.`}</Muted>
        : null}
      {kind === 'rickshaw' && rickshaws.data?.content.map((r) => (
        <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push(`/rickshaws/${r.id}`)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Plate number={r.rickshawNumber} size="sm" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1}>{r.owner.fullName}</Text>
              <Muted>{r.thana}</Muted>
            </View>
            <StatusBadge status={r.status} />
          </Card>
        </Pressable>
      ))}
      {kind === 'driver' && drivers.data?.content.map((d) => (
        <Pressable key={d.id} accessibilityRole="button" onPress={() => router.push(`/drivers/${d.id}`)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AuthImage id={d.photoId} width={44} ratio={3 / 4} label={d.fullName} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1}>{d.fullName}</Text>
              <Muted>{d.driverCode}</Muted>
            </View>
            <StatusBadge status={d.status} />
          </Card>
        </Pressable>
      ))}
    </Screen>
  )
}
