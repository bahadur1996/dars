import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { colors, fonts } from '../components/theme'
import { Button, Card, Muted, Plate, Screen, SectionLabel, StatusBadge } from '../components/ui'
import { rickshawApi } from '../lib/api'
import { useAuth } from '../lib/auth'

const ACTIONS = [
  { title: 'Register rickshaw', sub: 'Photo, driver and owner', href: '/rickshaws/new' },
  { title: 'Register driver', sub: 'NID, photo and address', href: '/drivers/new' },
  { title: 'Scan card', sub: 'Check a QR registration card', href: '/scan' },
  { title: 'Find', sub: 'By number, NID or mobile', href: '/search' },
] as const

export default function HomeScreen() {
  const { user, logout } = useAuth()
  const recent = useQuery({ queryKey: ['rickshaws', 'mine-recent'], queryFn: () => rickshawApi.search({ size: 5 }) })

  return (
    <Screen>
      <Text style={{ fontFamily: fonts.body, color: colors.muted }}>Signed in as</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginBottom: 16 }}>{user?.fullName}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        {ACTIONS.map((a, i) => (
          <Pressable
            key={a.href}
            accessibilityRole="button"
            onPress={() => router.push(a.href)}
            style={({ pressed }) => ({
              width: '48%',
              flexGrow: 1,
              minHeight: 96,
              borderRadius: 10,
              padding: 14,
              justifyContent: 'flex-end',
              backgroundColor: i === 0 ? colors.plate : colors.white,
              borderWidth: 1,
              borderColor: i === 0 ? colors.plate : colors.rule,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 21, color: i === 0 ? colors.white : colors.ink }}>{a.title}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: i === 0 ? 'rgba(255,255,255,0.85)' : colors.muted }}>{a.sub}</Text>
          </Pressable>
        ))}
      </View>

      <SectionLabel>Latest registrations</SectionLabel>
      {recent.data?.content.length === 0 ? <Muted>Nothing registered yet.</Muted> : null}
      {recent.data?.content.map((r) => (
        <Pressable key={r.id} onPress={() => router.push(`/rickshaws/${r.id}`)} accessibilityRole="button">
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
            <Plate number={r.rickshawNumber} size="sm" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1}>{r.currentDriver?.fullName ?? 'No driver'}</Text>
              <Muted>{r.thana}</Muted>
            </View>
            <StatusBadge status={r.status} />
          </Card>
        </Pressable>
      ))}
      {recent.isError ? <Muted>Could not load recent registrations. Check the connection.</Muted> : null}

      <View style={{ marginTop: 24 }}>
        <Button title="Sign out" kind="text" onPress={() => void logout()} />
      </View>
    </Screen>
  )
}
