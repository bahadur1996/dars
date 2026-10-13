import { describe, expect, it } from '@jest/globals'
import { rickshawNumberFromQr } from '../qr'
import { resizeFor } from '../photo'
import { dhakaNowLocal } from '../datetime'
import { caseSchema, driverSchema, rickshawSchema } from '../schemas'

describe('rickshawNumberFromQr', () => {
  it('reads the number from a card scan URL (FR-17)', () => {
    expect(rickshawNumberFromQr('https://dars.example.gov.bd/r/DHK-AR-000123')).toBe('DHK-AR-000123')
    expect(rickshawNumberFromQr('http://localhost:5173/r/dhk-ar-000123?x=1')).toBe('DHK-AR-000123')
  })
  it('still reads cards printed before v1.2 (verify URL)', () => {
    expect(rickshawNumberFromQr('https://dars.example.gov.bd/api/v1/public/verify/DHK-AR-000123')).toBe('DHK-AR-000123')
  })
  it('accepts a bare number in any case', () => {
    expect(rickshawNumberFromQr(' mir-12a ')).toBe('MIR-12A')
  })
  it('rejects unrelated QR codes', () => {
    expect(rickshawNumberFromQr('https://example.com/some/page')).toBeNull()
    expect(rickshawNumberFromQr('WIFI:S:home;T:WPA;P:secret;;')).toBeNull()
    expect(rickshawNumberFromQr('https://example.com/r/%E0%A4%A')).toBeNull()
  })
})

describe('resizeFor', () => {
  it('constrains the long edge of a landscape photo', () => expect(resizeFor(4000, 3000)).toEqual({ width: 1600 }))
  it('constrains the long edge of a portrait photo', () => expect(resizeFor(3000, 4000)).toEqual({ height: 1600 }))
  it('leaves small photos alone', () => expect(resizeFor(1200, 900)).toBeNull())
})

describe('shared schemas', () => {
  const address = { division: 'Dhaka', district: 'Dhaka', thana: 'Mirpur', line: 'House 1' }
  it('validates a driver like the backend does', () => {
    const r = driverSchema.safeParse({
      fullName: 'A', fatherName: 'B', dateOfBirth: '1990-01-01', gender: 'MALE', nid: '123', licenceNo: '',
      mobile: '0171', presentAddress: address, permanentAddress: address, bloodGroup: '', emergencyName: '',
      emergencyPhone: '', photoId: 'p', nidFrontId: null, nidBackId: null,
    })
    expect(r.error?.issues.map((i) => i.path.join('.'))).toEqual(expect.arrayContaining(['nid', 'mobile']))
  })
  it('auto-issues a number when left blank', () => {
    const r = rickshawSchema.parse({ rickshawNumber: '', chassisNo: '', motorNo: '', color: '', model: '', thana: 'Mirpur', photoId: 'p', rearPhotoId: null, ownerId: 1 })
    expect(r.rickshawNumber).toBeNull()
    expect(r).not.toHaveProperty('driverId') // drivers are not linked to rickshaws (v1.2)
  })
})

describe('dhakaNowLocal', () => {
  it('formats the Dhaka wall time (UTC+6) for the incident field', () => {
    expect(dhakaNowLocal(new Date('2026-10-13T20:45:10Z'))).toBe('2026-10-14T02:45')
  })
})

describe('case schema (FR-15)', () => {
  const base = { rickshawId: null, driverId: null, complaintId: null, offence: 'Overcharging', description: 'Asked 3x fare',
    incidentAt: '2026-10-01T09:30', thana: 'Mirpur', evidencePhotoIds: [] }
  it('needs a rickshaw or a driver', () => {
    const r = caseSchema.safeParse(base)
    expect(r.error?.issues.map((i) => i.path.join('.'))).toEqual(['rickshawId'])
  })
  it('turns the Dhaka incident time into an ISO instant', () => {
    expect(caseSchema.parse({ ...base, driverId: 7 }).incidentAt).toBe('2026-10-01T03:30:00.000Z')
  })
  it('rejects more than 3 evidence photos', () => {
    expect(caseSchema.safeParse({ ...base, rickshawId: 1, evidencePhotoIds: ['a', 'b', 'c', 'd'] }).success).toBe(false)
  })
})
