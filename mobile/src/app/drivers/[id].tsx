import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Text, View } from 'react-native'
import { AuthImage } from '../../components/AuthImage'
import { CaseList, ComplaintList } from '../../components/Records'
import { colors, fonts } from '../../components/theme'
import { Banner, Button, Card, Mono, Row, Screen, SectionLabel, StatusBadge } from '../../components/ui'
import { driverApi } from '../../lib/api'
import type { Address } from '../../lib/types'

const addr = (a: Address) => `${a.line}, ${a.thana}, ${a.district}`

export default function DriverScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>()
  const id = Number(idParam)
  const { data: d, error } = useQuery({ queryKey: ['driver', id], queryFn: () => driverApi.get(id) })
  const complaints = useQuery({ queryKey: ['driver', id, 'complaints'], queryFn: () => driverApi.complaints(id) })
  const cases = useQuery({ queryKey: ['driver', id, 'cases'], queryFn: () => driverApi.cases(id) })

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

      <Card>
        <SectionLabel>Complaints</SectionLabel>
        <ComplaintList rows={complaints.data} />
      </Card>

      <Card>
        <SectionLabel>Cases</SectionLabel>
        <CaseList rows={cases.data} />
        <Button title="File a case" kind="outline" onPress={() => router.push({ pathname: '/cases/new', params: { driverId: String(id) } })} />
      </Card>
    </Screen>
  )
}
