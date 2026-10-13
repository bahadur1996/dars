import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { AuthImage } from '../../components/AuthImage'
import { shortDate } from '../../components/Records'
import { colors, fonts } from '../../components/theme'
import { Banner, Card, Mono, Muted, Plate, Row, Screen, SectionLabel, StatusBadge } from '../../components/ui'
import { caseApi } from '../../lib/api'

const dateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })

/** Read-only case view. Status changes (with a note) are made in the web app. */
export default function CaseScreen() {
  const { id: idParam, filed } = useLocalSearchParams<{ id: string; filed?: string }>()
  const id = Number(idParam)
  const { data: c, error } = useQuery({ queryKey: ['case', id], queryFn: () => caseApi.get(id) })

  if (error) return <Screen><Banner message={error.message} /></Screen>
  if (!c) return <Screen><ActivityIndicator color={colors.plate} /></Screen>

  return (
    <Screen>
      {filed ? <Banner kind="success" message={`Case ${c.caseNo} filed.`} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink }}>{c.caseNo}</Text>
        <StatusBadge status={c.status} />
      </View>
      <Muted style={{ marginBottom: 12 }}>Filed {shortDate(c.filedAt)} by {c.filedBy.fullName}</Muted>

      <Card>
        <SectionLabel>Against</SectionLabel>
        {c.rickshaw ? (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/rickshaws/${c.rickshaw!.id}`)} style={{ marginBottom: 10 }}>
            <Plate number={c.rickshaw.rickshawNumber} />
          </Pressable>
        ) : null}
        {c.driver ? (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/drivers/${c.driver!.id}`)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <AuthImage id={c.driver.photoId} width={44} ratio={3 / 4} label={c.driver.fullName} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.body, color: colors.ink }}>{c.driver.fullName}</Text>
              <Mono>{c.driver.driverCode}</Mono>
            </View>
          </Pressable>
        ) : null}
        {c.complaint ? <Row label="From complaint"><Mono>{c.complaint.complaintNo}</Mono></Row> : null}
      </Card>

      <Card>
        <SectionLabel>Details</SectionLabel>
        <Row label="Offence">{c.offence}</Row>
        <Row label="When">{dateTime(c.incidentAt)}</Row>
        <Row label="Thana">{c.thana}</Row>
        <Row label="Description">{c.description}</Row>
        {c.resolutionNote ? <Row label="Resolution note">{c.resolutionNote}</Row> : null}
      </Card>

      {c.evidencePhotoIds.length > 0 ? (
        <Card>
          <SectionLabel>Evidence photos</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {c.evidencePhotoIds.map((p, i) => (
              <View key={p} style={{ flex: 1 }}><AuthImage id={p} width="100%" ratio={4 / 3} label={`Evidence photo ${i + 1}`} /></View>
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  )
}
