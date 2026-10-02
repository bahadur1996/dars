import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Platform } from 'react-native'
import { photoApi } from './api'

/** Max edge and JPEG quality for uploads (PRD NFR: ≤ 1600 px, ~500 KB). */
export const MAX_EDGE = 1600
export const QUALITY = 0.8

/** Which edge to constrain, or null when the image is already small enough. */
export function resizeFor(width: number, height: number, maxEdge = MAX_EDGE): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= maxEdge) return null
  return width >= height ? { width: maxEdge } : { height: maxEdge }
}

/** Downscales and re-encodes a captured photo as JPEG. */
export async function compress(uri: string, width: number, height: number): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri)
  const size = resizeFor(width, height)
  if (size) ctx.resize(size)
  const image = await ctx.renderAsync()
  const saved = await image.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG })
  return saved.uri
}

/** Compresses and uploads a photo; returns the backend photo id. */
export async function uploadPhoto(uri: string, width: number, height: number): Promise<string> {
  const jpeg = await compress(uri, width, height)
  const form = new FormData()
  if (Platform.OS === 'web') {
    form.append('file', await (await fetch(jpeg)).blob(), 'photo.jpg')
  } else {
    // React Native's FormData accepts a file descriptor object.
    form.append('file', { uri: jpeg, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob)
  }
  return photoApi.upload(form)
}
