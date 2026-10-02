import { describe, expect, it } from 'vitest'
import { driverSchema, isAdult, ownerSchema, rickshawSchema } from './schemas'

const address = { division: 'Dhaka', district: 'Dhaka', thana: 'Mirpur', line: 'House 1' }
const validDriver = {
  fullName: 'Abdul Karim',
  fatherName: 'Rahim Uddin',
  dateOfBirth: '1990-05-01',
  gender: 'MALE' as const,
  nid: '1234567890',
  licenceNo: '',
  mobile: '01712345678',
  presentAddress: address,
  permanentAddress: address,
  bloodGroup: '',
  emergencyName: '',
  emergencyPhone: '',
  photoId: 'abc',
  nidFrontId: null,
  nidBackId: null,
}

const fieldsOf = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.error?.issues.map((i) => i.path.join('.')) ?? []

describe('driverSchema', () => {
  it('accepts a valid driver and turns blank optionals into null', () => {
    const r = driverSchema.safeParse(validDriver)
    expect(r.success).toBe(true)
    expect(r.data?.licenceNo).toBeNull()
    expect(r.data?.emergencyPhone).toBeNull()
  })

  it.each(['123', '12345678901', '123456789012345678', 'abcdefghij'])('rejects NID %s', (nid) => {
    expect(fieldsOf(driverSchema.safeParse({ ...validDriver, nid }))).toContain('nid')
  })

  it('accepts a 17-digit NID', () => {
    expect(driverSchema.safeParse({ ...validDriver, nid: '12345678901234567' }).success).toBe(true)
  })

  it.each(['0171234567', '01212345678', '+8801712345678'])('rejects mobile %s', (mobile) => {
    expect(fieldsOf(driverSchema.safeParse({ ...validDriver, mobile }))).toContain('mobile')
  })

  it('requires the driver photo', () => {
    expect(fieldsOf(driverSchema.safeParse({ ...validDriver, photoId: '' }))).toContain('photoId')
  })

  it('requires nested address fields', () => {
    const r = driverSchema.safeParse({ ...validDriver, presentAddress: { ...address, thana: ' ' } })
    expect(fieldsOf(r)).toContain('presentAddress.thana')
  })
})

describe('isAdult', () => {
  const today = new Date('2026-10-02T12:00:00')
  it('is true on the 18th birthday', () => expect(isAdult('2008-10-02', today)).toBe(true))
  it('is false the day before', () => expect(isAdult('2008-10-03', today)).toBe(false))
  it('is false for garbage', () => expect(isAdult('not-a-date', today)).toBe(false))
})

describe('rickshawSchema', () => {
  const valid = { rickshawNumber: '', thana: 'Mirpur', photoId: 'p', rearPhotoId: null, ownerId: 1, driverId: 2,
    chassisNo: '', motorNo: '', color: '', model: '' }

  it('treats a blank number as "issue one for me"', () => {
    expect(rickshawSchema.parse(valid).rickshawNumber).toBeNull()
  })

  it('uppercases a typed number', () => {
    expect(rickshawSchema.parse({ ...valid, rickshawNumber: ' mir-12a ' }).rickshawNumber).toBe('MIR-12A')
  })

  it.each(['AB', 'DHK 123', 'DHK_1'])('rejects number %s', (n) => {
    expect(fieldsOf(rickshawSchema.safeParse({ ...valid, rickshawNumber: n }))).toContain('rickshawNumber')
  })
})

describe('ownerSchema', () => {
  it('validates NID and mobile', () => {
    const r = ownerSchema.safeParse({ fullName: 'X', nid: '1', mobile: '1', address })
    expect(fieldsOf(r)).toEqual(expect.arrayContaining(['nid', 'mobile']))
  })
})
