import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { colors, fonts } from '../components/theme'
import { Banner, Button, Card, Field, Muted, Plate, Screen, StatusBadge } from '../components/ui'
import { rickshawApi } from '../lib/api'

/** Look up a rickshaw by its number, or by its current driver's code, NID or mobile. */
export default function SearchScreen() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const results = useQuery({ queryKey: ['rickshaws', 'search', q], queryFn: () => rickshawApi.search({ q, size: 20 }), enabled: q.length > 0 })

  return (
    <Screen>
      <Field label="Number, driver code, NID or mobile" value={input} onChangeText={setInput} autoCapitalize="characters" autoCorrect={false} returnKeyType="search" onSubmitEditing={() => setQ(input.trim())} placeholder="DHK-AR-000123" />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1 }}><Button title="Search" onPress={() => setQ(input.trim())} disabled={!input.trim()} /></View>
        <View style={{ flex: 1 }}><Button title="Scan card" kind="outline" onPress={() => router.push('/scan')} /></View>
      </View>
      {results.isFetching ? <ActivityIndicator color={colors.plate} /> : null}
      <Banner message={results.error?.message} />
      {results.data?.totalElements === 0 ? <Muted>No registered rickshaw matches “{q}”. It may be unregistered.</Muted> : null}
      {results.data?.content.map((r) => (
        <Pressable key={r.id} accessibilityRole="button" onPress={() => router.push(`/rickshaws/${r.id}`)}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Plate number={r.rickshawNumber} size="sm" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1}>{r.currentDriver?.fullName ?? 'No driver'}</Text>
              <Muted>{r.thana}</Muted>
            </View>
            <StatusBadge status={r.status} />
          </Card>
        </Pressable>
      ))}
    </Screen>
  )
}
