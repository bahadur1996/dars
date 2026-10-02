// Mirrors the backend DTOs (bd.dhaka.dars.*Dtos).

export type Role = 'ADMIN' | 'OFFICER'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type DriverStatus = 'ACTIVE' | 'SUSPENDED' | 'BLACKLISTED'
export type RickshawStatus = 'ACTIVE' | 'SUSPENDED' | 'IMPOUNDED'

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ApiError {
  code: string
  message: string
  fieldErrors: { field: string; message: string }[]
}

export interface User {
  id: number
  username: string
  fullName: string
  role: Role
  enabled: boolean
  locked: boolean
  createdAt: string
}

export interface UserRef {
  id: number
  username: string
  fullName: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

export interface Address {
  division: string
  district: string
  thana: string
  line: string
}

export interface DriverSummary {
  id: number
  driverCode: string
  fullName: string
  nid: string
  mobile: string
  photoId: string
  status: DriverStatus
}

export interface Driver {
  id: number
  driverCode: string
  fullName: string
  fatherName: string
  dateOfBirth: string
  gender: Gender
  nid: string
  licenceNo: string | null
  mobile: string
  presentAddress: Address
  permanentAddress: Address
  bloodGroup: string | null
  emergencyName: string | null
  emergencyPhone: string | null
  photoId: string
  nidFrontId: string | null
  nidBackId: string | null
  status: DriverStatus
  currentRickshaw: { id: number; rickshawNumber: string } | null
  registeredBy: UserRef
  registeredAt: string
  updatedAt: string
}

export interface Owner {
  id: number
  fullName: string
  nid: string
  mobile: string
  address: Address
  createdBy: UserRef
  createdAt: string
}

export interface Rickshaw {
  id: number
  rickshawNumber: string
  chassisNo: string | null
  motorNo: string | null
  color: string | null
  model: string | null
  thana: string
  photoId: string
  rearPhotoId: string | null
  status: RickshawStatus
  owner: Owner
  currentDriver: DriverSummary | null
  registeredBy: UserRef
  registeredAt: string
  updatedAt: string
}

export interface Assignment {
  id: number
  driver: DriverSummary
  fromDate: string
  toDate: string | null
  assignedBy: UserRef
}

export interface AuditEntry {
  id: number
  actor: UserRef | null
  action: string
  entity: string
  entityId: string | null
  details: string | null
  at: string
}

export interface Count {
  label: string
  count: number
}

export interface DashboardSummary {
  totalRickshaws: number
  activeRickshaws: number
  totalDrivers: number
  registeredToday: number
  perDay: Count[]
  perThana: Count[]
  topOfficers: Count[]
}
