import { CameraView, useCameraPermissions } from 'expo-camera'
import { router } from 'expo-router'
import { useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { colors, fonts } from '../components/theme'
import { Banner, Button, Screen } from '../components/ui'
import { ApiError, rickshawApi } from '../lib/api'
import { rickshawNumberFromQr } from '../lib/qr'

/** Scan the QR code on a registration card and open that rickshaw. */
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [message, setMessage] = useState<string | null>(null)
  const handling = useRef(false)

  async function onScanned(data: string) {
    if (handling.current) return
    handling.current = true
    const number = rickshawNumberFromQr(data)
    if (!number) {
      setMessage('That QR code is not a DARS registration card.')
      setTimeout(() => (handling.current = false), 1500)
      return
    }
    try {
      const r = await rickshawApi.byNumber(number)
      router.replace(`/rickshaws/${r.id}`)
    } catch (e) {
      setMessage(e instanceof ApiError && e.status === 404 ? `${number} is not registered. The card may be fake.` : 'Could not look up the card. Check the connection.')
      setTimeout(() => (handling.current = false), 2000)
    }
  }

  if (!permission) return <Screen><Text>Checking camera access…</Text></Screen>
  if (!permission.granted) {
    return (
      <Screen>
        <Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.ink, marginBottom: 16, marginTop: 80 }}>
          Scanning a registration card needs the camera.
        </Text>
        <Button title="Allow camera" onPress={() => void requestPermission()} />
        <Button title="Search by number instead" kind="text" onPress={() => router.replace('/search')} />
      </Screen>
    )
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => void onScanned(data)}
      />
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 40 }}>
        <Banner message={message} />
        <Text style={{ fontFamily: fonts.bodyBold, color: colors.white, textAlign: 'center' }}>Point at the QR code on the card</Text>
      </View>
    </View>
  )
}
