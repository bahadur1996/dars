import { describe, expect, it } from 'vitest'
import { caseSchema, driverSchema, isAdult, localToIso, ownerSchema, publicComplaintSchema, rickshawSchema } from './schemas'

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
  const valid = { rickshawNumber: '', thana: 'Mirpur', photoId: 'p', rearPhotoId: null, ownerId: 1,
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

describe('localToIso', () => {
  it('reads a datetime-local value as Dhaka time', () => {
    expect(localToIso('2026-10-13T09:30')).toBe('2026-10-13T03:30:00.000Z')
  })
  it('turns blank into null', () => expect(localToIso('')).toBeNull())
})

describe('publicComplaintSchema', () => {
  const valid = {
    rickshawNumber: ' dhk-ar-000001 ', driverCode: 'drv-2026-000001', complainantName: 'Rina Akter',
    complainantPhone: '01912345678', complainantNid: '1234567890', category: 'OVERCHARGING' as const,
    description: 'Charged double', incidentAt: '', thana: '', website: '',
  }

  it('uppercases the numbers and nulls blank optionals', () => {
    const out = publicComplaintSchema.parse(valid)
    expect(out.rickshawNumber).toBe('DHK-AR-000001')
    expect(out.driverCode).toBe('DRV-2026-000001')
    expect(out.incidentAt).toBeNull()
    expect(out.thana).toBeNull()
  })

  it('requires the rickshaw, driver and complainant details', () => {
    const r = publicComplaintSchema.safeParse({ ...valid, rickshawNumber: ' ', driverCode: '', complainantName: '', complainantPhone: '123', complainantNid: '1' })
    expect(fieldsOf(r)).toEqual(expect.arrayContaining(['rickshawNumber', 'driverCode', 'complainantName', 'complainantPhone', 'complainantNid']))
  })

  it('rejects an incident in the future', () => {
    expect(fieldsOf(publicComplaintSchema.safeParse({ ...valid, incidentAt: '2999-01-01T10:00' }))).toContain('incidentAt')
  })
})

describe('caseSchema', () => {
  const valid = {
    rickshawId: 1, driverId: null, complaintId: null, offence: 'Overcharging', description: 'Details',
    incidentAt: '2026-01-10T08:00', thana: 'Mirpur', evidencePhotoIds: [],
  }

  it('accepts a rickshaw-only case', () => expect(caseSchema.safeParse(valid).success).toBe(true))

  it('needs a rickshaw, a driver or a complaint', () => {
    expect(fieldsOf(caseSchema.safeParse({ ...valid, rickshawId: null }))).toContain('rickshawId')
    expect(caseSchema.safeParse({ ...valid, rickshawId: null, complaintId: 7 }).success).toBe(true)
  })

  it('allows at most 3 evidence photos', () => {
    expect(fieldsOf(caseSchema.safeParse({ ...valid, evidencePhotoIds: ['a', 'b', 'c', 'd'] }))).toContain('evidencePhotoIds')
  })
})
