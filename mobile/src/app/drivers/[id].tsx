import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { AuthImage } from '../../components/AuthImage'
import { colors, fonts } from '../../components/theme'
import { Banner, Card, Mono, Muted, Plate, Row, Screen, SectionLabel, StatusBadge } from '../../components/ui'
import { driverApi } from '../../lib/api'
import type { Address } from '../../lib/types'

const addr = (a: Address) => `${a.line}, ${a.thana}, ${a.district}`

export default function DriverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: d, error } = useQuery({ queryKey: ['driver', Number(id)], queryFn: () => driverApi.get(Number(id)) })

  if (error) return <Screen><Banner message={error.message} /></Screen>
  if (!d) return <Screen><ActivityIndicator color={colors.plate} /></Screen>

  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
        <AuthImage id={d.photoId} width={110} ratio={3 / 4} label={`Photo of ${d.fullName}`} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: colors.ink }}>{d.fullName}</Text>
          <Mono>{d.driverCode}</Mono>
          <StatusBadge status={d.status} />
        </View>
      </View>

      <Card>
        <SectionLabel>Drives</SectionLabel>
        {d.currentRickshaw ? (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/rickshaws/${d.currentRickshaw!.id}`)}>
            <Plate number={d.currentRickshaw.rickshawNumber} />
          </Pressable>
        ) : <Muted>Not assigned to a rickshaw.</Muted>}
      </Card>

      <Card>
        <SectionLabel>Identification</SectionLabel>
        <Row label="NID"><Mono>{d.nid}</Mono></Row>
        <Row label="Date of birth">{d.dateOfBirth}</Row>
        <Row label="Father's or husband's name">{d.fatherName}</Row>
        <Row label="Mobile"><Mono>{d.mobile}</Mono></Row>
        <Row label="Driving licence">{d.licenceNo ?? 'None'}</Row>
        <Row label="Blood group">{d.bloodGroup ?? 'Not known'}</Row>
        <Row label="Present address">{addr(d.presentAddress)}</Row>
        <Row label="Permanent address">{addr(d.permanentAddress)}</Row>
      </Card>
    </Screen>
  )
}
