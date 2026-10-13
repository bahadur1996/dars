import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { AuthImage } from '../../components/AuthImage'
import { OwnerPicker } from '../../components/OwnerPicker'
import { CaseList, ComplaintList, shortDate } from '../../components/Records'
import { colors, fonts } from '../../components/theme'
import { Banner, Button, Card, Field, Mono, Muted, Plate, Row, Screen, SectionLabel, StatusBadge } from '../../components/ui'
import { ApiError, rickshawApi } from '../../lib/api'
import type { Owner } from '../../lib/types'

export default function RickshawScreen() {
  const { id: idParam, registered } = useLocalSearchParams<{ id: string; registered?: string }>()
  const id = Number(idParam)
  const { data: r, error } = useQuery({ queryKey: ['rickshaw', id], queryFn: () => rickshawApi.get(id) })
  const ownership = useQuery({ queryKey: ['rickshaw', id, 'ownership'], queryFn: () => rickshawApi.ownership(id) })
  const complaints = useQuery({ queryKey: ['rickshaw', id, 'complaints'], queryFn: () => rickshawApi.complaints(id) })
  const cases = useQuery({ queryKey: ['rickshaw', id, 'cases'], queryFn: () => rickshawApi.cases(id) })
  const [transferring, setTransferring] = useState(false)

  if (error) return <Screen><Banner message={error.message} /></Screen>
  if (!r) return <Screen><ActivityIndicator color={colors.plate} /></Screen>

  return (
    <Screen>
      {registered ? <Banner kind="success" message={`Registered as ${r.rickshawNumber}. Print the card from the web app and attach it to the vehicle.`} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Plate number={r.rickshawNumber} size="lg" />
        <StatusBadge status={r.status} />
      </View>
      <Muted style={{ marginBottom: 12 }}>Registered {shortDate(r.registeredAt)} by {r.registeredBy.fullName} · {r.thana}</Muted>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1 }}><AuthImage id={r.photoId} width="100%" ratio={4 / 3} label="Side photo" /></View>
        <View style={{ flex: 1 }}><AuthImage id={r.rearPhotoId} width="100%" ratio={4 / 3} label="Rear photo" /></View>
      </View>

      <Card>
        <SectionLabel>Owner</SectionLabel>
        <Row label="Name">{r.owner.fullName}</Row>
        <Row label="NID"><Mono>{r.owner.nid}</Mono></Row>
        <Row label="Mobile"><Mono>{r.owner.mobile}</Mono></Row>
        {transferring
          ? <TransferOwner rickshawId={id} currentOwnerId={r.owner.id} onClose={() => setTransferring(false)} />
          : <Button title="Change owner" kind="outline" onPress={() => setTransferring(true)} />}
      </Card>

      <Card>
        <SectionLabel>Vehicle</SectionLabel>
        <Row label="Colour">{r.color ?? '—'}</Row>
        <Row label="Make / model">{r.model ?? '—'}</Row>
        <Row label="Chassis / motor">{[r.chassisNo, r.motorNo].filter(Boolean).join(' / ') || '—'}</Row>
      </Card>

      <Card>
        <SectionLabel>Complaints</SectionLabel>
        <ComplaintList rows={complaints.data} />
      </Card>

      <Card>
        <SectionLabel>Cases</SectionLabel>
        <CaseList rows={cases.data} />
        <Button title="File a case" kind="outline" onPress={() => router.push({ pathname: '/cases/new', params: { rickshawId: String(id) } })} />
      </Card>

      <Card>
        <SectionLabel>Ownership history</SectionLabel>
        {ownership.data?.map((o) => (
          <View key={o.id} style={{ paddingVertical: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontFamily: fonts.body, color: colors.ink, flex: 1 }}>{o.owner.fullName}</Text>
              <Muted>{shortDate(o.fromDate)} – {o.toDate ? shortDate(o.toDate) : 'now'}</Muted>
            </View>
            {o.note ? <Muted>{o.note}</Muted> : null}
          </View>
        ))}
      </Card>
    </Screen>
  )
}

/** FR-13: hand the rickshaw to another owner. The current owner's period ends today and stays in the history. */
function TransferOwner({ rickshawId, currentOwnerId, onClose }: { rickshawId: number; currentOwnerId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const [owner, setOwner] = useState<Owner | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const same = owner?.id === currentOwnerId

  async function save() {
    if (!owner) return
    setBusy(true)
    setError(null)
    try {
      await rickshawApi.transferOwnership(rickshawId, owner.id, note.trim() || undefined)
      // ['rickshaw', id] is a prefix of the ownership key, so this refreshes the history too.
      await qc.invalidateQueries({ queryKey: ['rickshaw', rickshawId] })
      await qc.invalidateQueries({ queryKey: ['rickshaws'] })
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change the owner. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderColor: colors.rule }}>
      <SectionLabel>New owner</SectionLabel>
      <Muted style={{ marginBottom: 8 }}>The current owner’s period ends today and stays in the ownership history.</Muted>
      <Banner message={error ?? (same ? 'This is already the owner.' : null)} />
      <OwnerPicker owner={owner} onChange={setOwner} />
      <Field label="Note" value={note} onChangeText={setNote} placeholder="e.g. Sold on 12 Oct" maxLength={500} />
      <Button title={busy ? 'Saving…' : 'Transfer ownership'} onPress={() => void save()} busy={busy} disabled={!owner || same} />
      <Button title="Cancel" kind="text" onPress={onClose} />
    </View>
  )
}
