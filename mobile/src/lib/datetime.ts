const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000 // Asia/Dhaka is UTC+6 all year (no DST).

/** The current Dhaka wall time as `YYYY-MM-DDTHH:mm`, the format `localToIso` in schemas.ts expects. */
export function dhakaNowLocal(now = new Date()): string {
  return new Date(now.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 16)
}
