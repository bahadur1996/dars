import type { User } from '../api/types'

/** Officers may edit their own records for 24 hours (mirrors CurrentUser.checkCanEdit on the backend). */
export const OFFICER_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

export function canEdit(user: User | null, registeredById: number, registeredAt: string, now = Date.now()): boolean {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  return user.id === registeredById && now - new Date(registeredAt).getTime() < OFFICER_EDIT_WINDOW_MS
}
