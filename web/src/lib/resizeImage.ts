/** Max edge and JPEG quality for uploads (PRD NFR: ≤ 1600 px, ~500 KB). */
export const MAX_EDGE = 1600
export const QUALITY = 0.82

/** Returns the target size that fits inside maxEdge, never upscaling. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** Downscales and re-encodes an image as JPEG in the browser before upload. */
export async function resizeImage(source: Blob | HTMLVideoElement): Promise<Blob> {
  let drawable: CanvasImageSource
  let w: number
  let h: number
  if (source instanceof HTMLVideoElement) {
    drawable = source
    w = source.videoWidth
    h = source.videoHeight
  } else {
    const bitmap = await createImageBitmap(source)
    drawable = bitmap
    w = bitmap.width
    h = bitmap.height
  }
  const size = fitWithin(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(drawable, 0, 0, size.width, size.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', QUALITY),
  )
}
