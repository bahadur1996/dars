import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import type { CaseFile, Complaint, ComplaintCategory } from '../lib/types'
import { colors, fonts } from './theme'
import { Mono, Muted, StatusBadge } from './ui'

export const CATEGORY_LABEL: Record<ComplaintCategory, string> = {
  OVERCHARGING: 'Overcharging',
  MISBEHAVIOUR: 'Rude or abusive behaviour',
  RECKLESS_DRIVING: 'Reckless driving',
  ACCIDENT: 'Accident',
  THEFT: 'Theft',
  OTHER: 'Something else',
}

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

function RecordRow({ no, title, sub, status, onPress }: { no: string; title: string; sub: string; status: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: colors.rule }}>
      <View style={{ flex: 1 }}>
        <Mono>{no}</Mono>
        <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={2}>{title}</Text>
        <Muted>{sub}</Muted>
      </View>
      <StatusBadge status={status} />
    </Pressable>
  )
}

/** Read-only complaint list for the rickshaw and driver screens. Complaints are handled in the web app. */
export function ComplaintList({ rows }: { rows: Complaint[] | undefined }) {
  if (!rows) return <Muted>Loading…</Muted>
  if (rows.length === 0) return <Muted>No complaints.</Muted>
  return rows.map((c) => (
    <RecordRow key={c.id} no={c.complaintNo} title={CATEGORY_LABEL[c.category]} status={c.status}
      sub={`Filed ${shortDate(c.filedAt)}${c.thana ? ` · ${c.thana}` : ''}`} />
  ))
}

/** Case list for the rickshaw and driver screens; a row opens the case. Status changes happen in the web app. */
export function CaseList({ rows }: { rows: CaseFile[] | undefined }) {
  if (!rows) return <Muted>Loading…</Muted>
  if (rows.length === 0) return <Muted>No cases.</Muted>
  return rows.map((c) => (
    <RecordRow key={c.id} no={c.caseNo} title={c.offence} status={c.status}
      sub={`Incident ${shortDate(c.incidentAt)} · ${c.thana}`} onPress={() => router.push(`/cases/${c.id}`)} />
  ))
}
