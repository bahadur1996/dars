import { useEffect, useState } from 'react'
import { Image, Platform, Text, View, type ImageStyle } from 'react-native'
import { photoApi, request, session } from '../lib/api'
import { colors, fonts } from './theme'

/**
 * Photos require a bearer token. Native Image can send headers; the web build fetches a blob instead.
 */
export function AuthImage({ id, width, ratio = 1, label }: { id: string | null; width: number | `${number}%`; ratio?: number; label: string }) {
  const [webUrl, setWebUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (Platform.OS !== 'web' || !id) return
    let url: string | null = null
    let cancelled = false
    request<Response>(`/photos/${id}`, { raw: true })
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setWebUrl(url)
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
      setWebUrl(null)
    }
  }, [id])

  const box: ImageStyle = { width, aspectRatio: ratio, borderRadius: 8, backgroundColor: colors.paper }
  if (!id || failed) {
    return (
      <View style={[box, { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.rule }]}>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>{id ? 'Photo unavailable' : 'No photo'}</Text>
      </View>
    )
  }
  const source =
    Platform.OS === 'web'
      ? webUrl
        ? { uri: webUrl }
        : undefined
      : { uri: photoApi.url(id), headers: { Authorization: `Bearer ${session.accessToken ?? ''}` } }
  if (!source) return <View style={box} />
  return <Image accessibilityLabel={label} source={source} style={box} resizeMode="cover" onError={() => setFailed(true)} />
}
