import { PATTERNS } from './schemas'

/**
 * Extracts the rickshaw number from a scanned registration-card QR code.
 * Cards encode `<web base>/r/<NUMBER>` (FR-17); cards printed before v1.2 encode
 * `<base>/api/v1/public/verify/<NUMBER>`. A bare number is accepted too.
 */
export function rickshawNumberFromQr(data: string): string | null {
  const text = data.trim()
  const match = text.match(/\/(?:r|public\/verify)\/([^/?#]+)\/?(?:[?#].*)?$/)
  if (!match && /[/:]/.test(text)) return null
  let candidate: string
  try {
    candidate = decodeURIComponent(match ? match[1] : text).toUpperCase()
  } catch {
    return null
  }
  return PATTERNS.rickshawNumber.test(candidate) ? candidate : null
}
