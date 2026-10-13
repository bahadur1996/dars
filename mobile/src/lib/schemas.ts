// Copied from web/src/schemas.ts. Keep both in sync with backend bd.dhaka.dars.validation.Patterns.
import { z } from 'zod'

// Keep in sync with backend bd.dhaka.dars.validation.Patterns.
export const PATTERNS = {
  nid: /^(\d{10}|\d{17})$/,
  mobile: /^01[3-9]\d{8}$/,
  rickshawNumber: /^[A-Z0-9-]{3,20}$/,
  bloodGroup: /^(A|B|AB|O)[+-]$/,
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

const optional = (schema: z.ZodString) =>
  z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .pipe(schema.nullable())

const nid = z.string().trim().regex(PATTERNS.nid, 'Enter 10 or 17 digits')
const mobile = z.string().trim().regex(PATTERNS.mobile, 'Enter an 11-digit number starting with 01, e.g. 01712345678')

export const addressSchema = z.object({
  division: z.string().trim().min(1, 'Required').max(50),
  district: z.string().trim().min(1, 'Required').max(50),
  thana: z.string().trim().min(1, 'Required').max(50),
  line: z.string().trim().min(1, 'Required').max(200),
})

export function isAdult(dob: string, today = new Date()): boolean {
  const d = new Date(dob + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return false
  const eighteenth = new Date(d)
  eighteenth.setFullYear(d.getFullYear() + 18)
  return eighteenth <= today
}

export const driverSchema = z.object({
  fullName: z.string().trim().min(1, 'Required').max(100),
  fatherName: z.string().trim().min(1, 'Required').max(100),
  dateOfBirth: z
    .string()
    .min(1, 'Required')
    .refine((v) => isAdult(v), 'Driver must be at least 18 years old'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { message: 'Required' }),
  nid,
  licenceNo: optional(z.string().max(30).regex(/^[A-Za-z0-9-]*$/, 'Letters, digits and dashes only')),
  mobile,
  presentAddress: addressSchema,
  permanentAddress: addressSchema,
  bloodGroup: optional(z.string().regex(PATTERNS.bloodGroup, 'Pick a blood group')),
  emergencyName: optional(z.string().max(100)),
  emergencyPhone: optional(z.string().regex(PATTERNS.mobile, 'Enter an 11-digit number starting with 01')),
  photoId: z.string({ message: 'Add the driver photo' }).min(1, 'Add the driver photo'),
  nidFrontId: z.string().nullable(),
  nidBackId: z.string().nullable(),
})

export const ownerSchema = z.object({
  fullName: z.string().trim().min(1, 'Required').max(100),
  nid,
  mobile,
  address: addressSchema,
})

export const rickshawSchema = z.object({
  rickshawNumber: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v.toUpperCase()))
    .pipe(
      z.string().regex(PATTERNS.rickshawNumber, '3–20 characters: letters, digits or dashes').nullable(),
    ),
  chassisNo: optional(z.string().max(50)),
  motorNo: optional(z.string().max(50)),
  color: optional(z.string().max(30)),
  model: optional(z.string().max(50)),
  thana: z.string().trim().min(1, 'Required').max(50),
  photoId: z.string({ message: 'Add the rickshaw photo' }).min(1, 'Add the rickshaw photo'),
  rearPhotoId: z.string().nullable(),
  // Used on create only; an existing rickshaw changes owner through an ownership transfer (FR-13).
  ownerId: z.number({ message: 'Choose an owner' }),
})

export const COMPLAINT_CATEGORIES = ['OVERCHARGING', 'MISBEHAVIOUR', 'RECKLESS_DRIVING', 'ACCIDENT', 'THEFT', 'OTHER'] as const

/** A `datetime-local` value (Dhaka wall time) as an ISO instant, or null when blank or invalid. */
export function localToIso(v: string | null | undefined): string | null {
  if (!v) return null
  const d = new Date(v.length === 16 ? `${v}:00+06:00` : v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const notFuture = (v: string | null) => v === null || new Date(v).getTime() <= Date.now()

/** Public complaint form (FR-14). `website` is a honeypot that real users never see or fill. */
export const publicComplaintSchema = z.object({
  rickshawNumber: z.string().trim().min(1, 'Enter the number on the rickshaw').max(20).transform((v) => v.toUpperCase()),
  driverCode: z.string().trim().min(1, 'Enter the driver code from the registration card').max(20).transform((v) => v.toUpperCase()),
  complainantName: z.string().trim().min(1, 'Required').max(100),
  complainantPhone: mobile,
  complainantNid: nid,
  category: z.enum(COMPLAINT_CATEGORIES),
  description: z.string().trim().min(1, 'Tell us what happened').max(2000),
  incidentAt: z.string().transform(localToIso).refine(notFuture, 'Cannot be in the future'),
  thana: optional(z.string().max(50)),
  website: z.string(),
})

/** Case form (FR-15). Needs a rickshaw, a driver or a source complaint (which supplies both). */
export const caseSchema = z
  .object({
    rickshawId: z.number().nullable(),
    driverId: z.number().nullable(),
    complaintId: z.number().nullable(),
    offence: z.string().trim().min(1, 'Required').max(200),
    description: z.string().trim().min(1, 'Required').max(2000),
    incidentAt: z
      .string()
      .min(1, 'Required')
      .transform(localToIso)
      .refine((v) => v !== null, 'Required')
      .refine(notFuture, 'Cannot be in the future'),
    thana: z.string().trim().min(1, 'Required').max(50),
    evidencePhotoIds: z.array(z.string()).max(3, 'At most 3 photos'),
  })
  .refine((c) => c.rickshawId !== null || c.driverId !== null || c.complaintId !== null, {
    message: 'Choose a rickshaw, a driver, or both',
    path: ['rickshawId'],
  })

export const userSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9._-]{3,50}$/, '3–50 letters, digits, dot, dash or underscore'),
  password: z.string().min(8, 'At least 8 characters').max(72),
  fullName: z.string().trim().min(1, 'Required').max(100),
  role: z.enum(['ADMIN', 'OFFICER']),
})

export type DriverForm = z.input<typeof driverSchema>
export type DriverInput = z.output<typeof driverSchema>
export type OwnerForm = z.input<typeof ownerSchema>
export type OwnerInput = z.output<typeof ownerSchema>
export type RickshawForm = z.input<typeof rickshawSchema>
export type RickshawInput = z.output<typeof rickshawSchema>
export type UserForm = z.input<typeof userSchema>
export type PublicComplaintForm = z.input<typeof publicComplaintSchema>
export type PublicComplaintInput = z.output<typeof publicComplaintSchema>
export type CaseForm = z.input<typeof caseSchema>
export type CaseInput = z.output<typeof caseSchema>
