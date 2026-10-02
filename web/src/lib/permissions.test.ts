import { describe, expect, it } from 'vitest'
import type { User } from '../api/types'
import { canEdit } from './permissions'

const officer: User = { id: 7, username: 'o', fullName: 'O', role: 'OFFICER', enabled: true, locked: false, createdAt: '' }
const admin: User = { ...officer, id: 1, role: 'ADMIN' }
const now = new Date('2026-10-02T12:00:00Z').getTime()

describe('canEdit', () => {
  it('lets an admin edit anything', () => {
    expect(canEdit(admin, 99, '2020-01-01T00:00:00Z', now)).toBe(true)
  })
  it('lets an officer edit their own record within 24 hours', () => {
    expect(canEdit(officer, 7, '2026-10-01T13:00:00Z', now)).toBe(true)
  })
  it('blocks an officer after 24 hours', () => {
    expect(canEdit(officer, 7, '2026-10-01T11:59:00Z', now)).toBe(false)
  })
  it("blocks an officer from someone else's record", () => {
    expect(canEdit(officer, 8, '2026-10-02T11:00:00Z', now)).toBe(false)
  })
  it('blocks when signed out', () => {
    expect(canEdit(null, 7, '2026-10-02T11:00:00Z', now)).toBe(false)
  })
})
