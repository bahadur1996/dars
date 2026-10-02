import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { AuthImage } from '../../components/AuthImage'
import { colors, fonts } from '../../components/theme'
import { Banner, Card, Mono, Muted, Plate, Row, Screen, SectionLabel, StatusBadge } from '../../components/ui'
import { rickshawApi } from '../../lib/api'

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export default function RickshawScreen() {
  const { id, registered } = useLocalSearchParams<{ id: string; registered?: string }>()
  const { data: r, error } = useQuery({ queryKey: ['rickshaw', Number(id)], queryFn: () => rickshawApi.get(Number(id)) })
  const history = useQuery({ queryKey: ['rickshaw', Number(id), 'history'], queryFn: () => rickshawApi.history(Number(id)) })

  if (error) return <Screen><Banner message={error.message} /></Screen>
  if (!r) return <Screen><ActivityIndicator color={colors.plate} /></Screen>

  return (
    <Screen>
      {registered ? <Banner kind="success" message={`Registered as ${r.rickshawNumber}. Print the card from the web app and attach it to the vehicle.`} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Plate number={r.rickshawNumber} size="lg" />
        <StatusBadge status={r.status} />
      </View>
      <Muted style={{ marginBottom: 12 }}>Registered {date(r.registeredAt)} by {r.registeredBy.fullName} · {r.thana}</Muted>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1 }}><AuthImage id={r.photoId} width="100%" ratio={4 / 3} label="Side photo" /></View>
        <View style={{ flex: 1 }}><AuthImage id={r.rearPhotoId} width="100%" ratio={4 / 3} label="Rear photo" /></View>
      </View>

      <Card>
        <SectionLabel>Driver</SectionLabel>
        {r.currentDriver ? (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/drivers/${r.currentDriver!.id}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <AuthImage id={r.currentDriver.photoId} width={64} ratio={3 / 4} label={r.currentDriver.fullName} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink }}>{r.currentDriver.fullName}</Text>
              <Mono>{r.currentDriver.driverCode}</Mono>
              <Muted>NID {r.currentDriver.nid} · {r.currentDriver.mobile}</Muted>
            </View>
            <StatusBadge status={r.currentDriver.status} />
          </Pressable>
        ) : <Muted>No driver assigned.</Muted>}
      </Card>

      <Card>
        <SectionLabel>Owner</SectionLabel>
        <Row label="Name">{r.owner.fullName}</Row>
        <Row label="NID"><Mono>{r.owner.nid}</Mono></Row>
        <Row label="Mobile"><Mono>{r.owner.mobile}</Mono></Row>
      </Card>

      <Card>
        <SectionLabel>Vehicle</SectionLabel>
        <Row label="Colour">{r.color ?? '—'}</Row>
        <Row label="Make / model">{r.model ?? '—'}</Row>
        <Row label="Chassis / motor">{[r.chassisNo, r.motorNo].filter(Boolean).join(' / ') || '—'}</Row>
      </Card>

      <Card>
        <SectionLabel>Driver history</SectionLabel>
        {history.data?.map((a) => (
          <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ fontFamily: fonts.body, color: colors.ink, flex: 1 }}>{a.driver.fullName}</Text>
            <Muted>{date(a.fromDate)} – {a.toDate ? date(a.toDate) : 'now'}</Muted>
          </View>
        ))}
      </Card>
    </Screen>
  )
}
