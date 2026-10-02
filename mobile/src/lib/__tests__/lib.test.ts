import { describe, expect, it } from '@jest/globals'
import { rickshawNumberFromQr } from '../qr'
import { resizeFor } from '../photo'
import { driverSchema, rickshawSchema } from '../schemas'

describe('rickshawNumberFromQr', () => {
  it('reads the number from a card verify URL', () => {
    expect(rickshawNumberFromQr('https://dars.example.gov.bd/api/v1/public/verify/DHK-AR-000123')).toBe('DHK-AR-000123')
  })
  it('accepts a bare number in any case', () => {
    expect(rickshawNumberFromQr(' mir-12a ')).toBe('MIR-12A')
  })
  it('rejects unrelated QR codes', () => {
    expect(rickshawNumberFromQr('https://example.com/some/page')).toBeNull()
    expect(rickshawNumberFromQr('WIFI:S:home;T:WPA;P:secret;;')).toBeNull()
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
    const r = rickshawSchema.parse({ rickshawNumber: '', chassisNo: '', motorNo: '', color: '', model: '', thana: 'Mirpur', photoId: 'p', rearPhotoId: null, ownerId: 1, driverId: 2 })
    expect(r.rickshawNumber).toBeNull()
  })
})
