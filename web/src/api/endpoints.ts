import { api, API_BASE } from './client'
import type {
  AuditEntry,
  CaseFile,
  CaseStatus,
  Complaint,
  ComplaintStatus,
  DashboardSummary,
  Driver,
  DriverStatus,
  DriverSummary,
  Owner,
  Ownership,
  Page,
  PublicComplaint,
  PublicVerify,
  Rickshaw,
  RickshawStatus,
  Role,
  TokenResponse,
  User,
} from './types'
import type { CaseInput, DriverInput, OwnerInput, PublicComplaintInput, RickshawInput } from '../schemas'

type Params = Record<string, string | number | undefined>

const clean = (p: Params) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))

export const authApi = {
  login: (username: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { username, password }).then((r) => r.data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
}

export const photoApi = {
  upload: (blob: Blob, filename = 'photo.jpg') => {
    const form = new FormData()
    form.append('file', blob, filename)
    return api.post<{ id: string }>('/photos', form).then((r) => r.data.id)
  },
  blob: (id: string) => api.get<Blob>(`/photos/${id}`, { responseType: 'blob' }).then((r) => r.data),
}

export const driverApi = {
  search: (p: Params) => api.get<Page<Driver>>('/drivers', { params: clean(p) }).then((r) => r.data),
  get: (id: number) => api.get<Driver>(`/drivers/${id}`).then((r) => r.data),
  create: (d: DriverInput) => api.post<Driver>('/drivers', d).then((r) => r.data),
  update: (id: number, d: DriverInput) => api.put<Driver>(`/drivers/${id}`, d).then((r) => r.data),
  setStatus: (id: number, status: DriverStatus, reason?: string) =>
    api.patch<Driver>(`/drivers/${id}/status`, { status, reason }).then((r) => r.data),
  checkNid: (nid: string) =>
    api
      .get<{ exists: boolean; driver: DriverSummary | null }>('/drivers/check-nid', { params: { nid } })
      .then((r) => r.data),
  complaints: (id: number) => api.get<Complaint[]>(`/drivers/${id}/complaints`).then((r) => r.data),
  cases: (id: number) => api.get<CaseFile[]>(`/drivers/${id}/cases`).then((r) => r.data),
}

export const ownerApi = {
  search: (p: Params) => api.get<Page<Owner>>('/owners', { params: clean(p) }).then((r) => r.data),
  get: (id: number) => api.get<Owner>(`/owners/${id}`).then((r) => r.data),
  create: (o: OwnerInput) => api.post<Owner>('/owners', o).then((r) => r.data),
  update: (id: number, o: OwnerInput) => api.put<Owner>(`/owners/${id}`, o).then((r) => r.data),
}

export const rickshawApi = {
  search: (p: Params) => api.get<Page<Rickshaw>>('/rickshaws', { params: clean(p) }).then((r) => r.data),
  get: (id: number) => api.get<Rickshaw>(`/rickshaws/${id}`).then((r) => r.data),
  byNumber: (n: string) => api.get<Rickshaw>(`/rickshaws/by-number/${encodeURIComponent(n)}`).then((r) => r.data),
  create: (r: RickshawInput) => api.post<Rickshaw>('/rickshaws', r).then((res) => res.data),
  update: (id: number, r: RickshawInput) => api.put<Rickshaw>(`/rickshaws/${id}`, r).then((res) => res.data),
  setStatus: (id: number, status: RickshawStatus, reason?: string) =>
    api.patch<Rickshaw>(`/rickshaws/${id}/status`, { status, reason }).then((r) => r.data),
  ownership: (id: number) => api.get<Ownership[]>(`/rickshaws/${id}/ownership`).then((r) => r.data),
  transferOwnership: (id: number, ownerId: number, note?: string) =>
    api.post<Ownership>(`/rickshaws/${id}/ownership`, { ownerId, note }).then((r) => r.data),
  complaints: (id: number) => api.get<Complaint[]>(`/rickshaws/${id}/complaints`).then((r) => r.data),
  cases: (id: number) => api.get<CaseFile[]>(`/rickshaws/${id}/cases`).then((r) => r.data),
  cardPdf: (id: number) => api.get<Blob>(`/rickshaws/${id}/card.pdf`, { responseType: 'blob' }).then((r) => r.data),
  qrPng: (id: number) => api.get<Blob>(`/rickshaws/${id}/qr.png`, { responseType: 'blob' }).then((r) => r.data),
}

export const complaintApi = {
  search: (p: Params) => api.get<Page<Complaint>>('/complaints', { params: clean(p) }).then((r) => r.data),
  get: (id: number) => api.get<Complaint>(`/complaints/${id}`).then((r) => r.data),
  setStatus: (id: number, status: ComplaintStatus, note: string) =>
    api.patch<Complaint>(`/complaints/${id}/status`, { status, note }).then((r) => r.data),
}

export const caseApi = {
  search: (p: Params) => api.get<Page<CaseFile>>('/cases', { params: clean(p) }).then((r) => r.data),
  get: (id: number) => api.get<CaseFile>(`/cases/${id}`).then((r) => r.data),
  create: (c: CaseInput) => api.post<CaseFile>('/cases', c).then((r) => r.data),
  setStatus: (id: number, status: CaseStatus, note: string) =>
    api.patch<CaseFile>(`/cases/${id}/status`, { status, note }).then((r) => r.data),
}

/** Unauthenticated endpoints used by the public complaint and QR scan pages. */
export const publicApi = {
  verify: (number: string) => api.get<PublicVerify>(`/public/verify/${encodeURIComponent(number)}`).then((r) => r.data),
  /** Plain URL (no token needed), usable directly as an <img> src. */
  verifyPhotoUrl: (number: string) => `${API_BASE}/public/verify/${encodeURIComponent(number)}/photo`,
  fileComplaint: (c: PublicComplaintInput) =>
    api.post<PublicComplaint>('/public/complaints', c).then((r) => r.data),
  complaintStatus: (complaintNo: string, phone: string) =>
    api
      .get<PublicComplaint>(`/public/complaints/${encodeURIComponent(complaintNo)}`, { params: { phone } })
      .then((r) => r.data),
}

export const userApi = {
  list: (p: Params) => api.get<Page<User>>('/users', { params: clean(p) }).then((r) => r.data),
  create: (u: { username: string; password: string; fullName: string; role: Role }) =>
    api.post<User>('/users', u).then((r) => r.data),
  update: (id: number, u: { enabled?: boolean; newPassword?: string; fullName?: string; role?: Role }) =>
    api.patch<User>(`/users/${id}`, u).then((r) => r.data),
}

export const auditApi = {
  list: (p: Params) => api.get<Page<AuditEntry>>('/audit', { params: clean(p) }).then((r) => r.data),
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
}
