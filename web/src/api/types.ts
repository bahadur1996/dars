// Mirrors the backend DTOs (bd.dhaka.dars.*Dtos).

export type Role = 'ADMIN' | 'OFFICER'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type DriverStatus = 'ACTIVE' | 'SUSPENDED' | 'BLACKLISTED'
export type RickshawStatus = 'ACTIVE' | 'SUSPENDED' | 'IMPOUNDED'
export type ComplaintStatus = 'OPEN' | 'RESOLVED' | 'REJECTED' | 'ESCALATED'
export type ComplaintCategory = 'OVERCHARGING' | 'MISBEHAVIOUR' | 'RECKLESS_DRIVING' | 'ACCIDENT' | 'THEFT' | 'OTHER'
export type CaseStatus = 'OPEN' | 'UNDER_INVESTIGATION' | 'CLOSED' | 'DISMISSED'

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
  registeredBy: UserRef
  registeredAt: string
  updatedAt: string
}

export interface RickshawRef {
  id: number
  rickshawNumber: string
}

export interface Ownership {
  id: number
  owner: Owner
  fromDate: string
  toDate: string | null
  changedBy: UserRef
  note: string | null
}

export interface CaseRef {
  id: number
  caseNo: string
  status: CaseStatus
}

export interface ComplaintRef {
  id: number
  complaintNo: string
}

export interface Complaint {
  id: number
  complaintNo: string
  rickshaw: RickshawRef
  driver: DriverSummary
  complainantName: string
  complainantPhone: string
  complainantNid: string
  category: ComplaintCategory
  description: string
  incidentAt: string | null
  thana: string | null
  status: ComplaintStatus
  resolutionNote: string | null
  caseFile: CaseRef | null
  handledBy: UserRef | null
  filedAt: string
  updatedAt: string
}

/** What the public form and status lookup return: no personal data. */
export interface PublicComplaint {
  complaintNo: string
  status: ComplaintStatus
  filedAt: string
  resolutionNote: string | null
}

export interface CaseFile {
  id: number
  caseNo: string
  rickshaw: RickshawRef | null
  driver: DriverSummary | null
  complaint: ComplaintRef | null
  offence: string
  description: string
  incidentAt: string
  thana: string
  status: CaseStatus
  resolutionNote: string | null
  evidencePhotoIds: string[]
  filedBy: UserRef
  filedAt: string
  updatedAt: string
  closedAt: string | null
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
  openComplaints: number
  /** OPEN and UNDER_INVESTIGATION. */
  openCases: number
  perDay: Count[]
  perThana: Count[]
  topOfficers: Count[]
}
