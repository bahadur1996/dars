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
  ownerId: z.number({ message: 'Choose an owner' }),
  driverId: z.number({ message: 'Choose a driver' }),
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
