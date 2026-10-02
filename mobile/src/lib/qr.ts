import { PATTERNS } from './schemas'

/**
 * Extracts the rickshaw number from a scanned registration-card QR code.
 * Cards encode `<base>/api/v1/public/verify/<NUMBER>`; a bare number is accepted too.
 */
export function rickshawNumberFromQr(data: string): string | null {
  const text = data.trim()
  const match = text.match(/\/public\/verify\/([^/?#]+)/)
  const candidate = decodeURIComponent(match ? match[1] : text).toUpperCase()
  return PATTERNS.rickshawNumber.test(candidate) ? candidate : null
}
