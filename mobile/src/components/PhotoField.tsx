import * as ImagePicker from 'expo-image-picker'
import { useState } from 'react'
import { ActivityIndicator, Platform, Text, View } from 'react-native'
import { ApiError } from '../lib/api'
import { uploadPhoto } from '../lib/photo'
import { AuthImage } from './AuthImage'
import { colors, fonts } from './theme'
import { Button, styles } from './ui'

/** Camera-first photo capture: take a photo (or pick one), compress, upload, return the photo id. */
export function PhotoField({ label, hint, value, onChange, error, required, ratio = 3 / 4 }: { label: string; hint?: string; value: string | null; onChange: (id: string | null) => void; error?: string; required?: boolean; ratio?: number }) {
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function capture(source: 'camera' | 'library') {
    setUploadError(null)
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false }
    let result: ImagePicker.ImagePickerResult
    if (source === 'camera' && Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (!perm.granted) {
        setUploadError('Camera access is off. Turn it on in Settings, or choose an existing photo.')
        return
      }
      result = await ImagePicker.launchCameraAsync(options)
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options)
    }
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setBusy(true)
    try {
      onChange(await uploadPhoto(asset.uri, asset.width, asset.height))
    } catch (e) {
      setUploadError(e instanceof ApiError ? e.message : 'The photo could not be processed. Try taking it again.')
    } finally {
      setBusy(false)
    }
  }

  const message = uploadError ?? error
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={{ color: colors.signal }}> *</Text> : null}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View>
          <AuthImage id={value} width={104} ratio={ratio} label={label} />
          {busy ? (
            <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8 }}>
              <ActivityIndicator color={colors.plate} />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Button title={value ? 'Retake photo' : 'Take photo'} kind="outline" onPress={() => void capture('camera')} disabled={busy} />
          <Button title="Choose existing" kind="text" onPress={() => void capture('library')} disabled={busy} />
        </View>
      </View>
      {message || hint ? (
        <Text style={[styles.help, { fontFamily: fonts.body }, message ? { color: colors.signal } : null]}>{message ?? hint}</Text>
      ) : null}
    </View>
  )
}
