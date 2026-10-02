import Constants from 'expo-constants'
import { secureStorage } from './storage'
import type {
  Assignment,
  Driver,
  DriverSummary,
  Owner,
  Page,
  Rickshaw,
  TokenResponse,
  User,
} from './types'
import type { DriverInput, OwnerInput, RickshawInput } from './schemas'

/**
 * Backend base URL. Override with EXPO_PUBLIC_API_URL, e.g. http://192.168.1.20:8080/api/v1 for a phone
 * on the same Wi-Fi, or http://10.0.2.2:8080/api/v1 for the Android emulator.
 */
export const API_BASE: string =
  process.env.EXPO_PUBLIC_API_URL ?? (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:8080/api/v1'

const REFRESH_KEY = 'dars.refreshToken'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly fieldErrors: { field: string; message: string }[] = [],
  ) {
    super(message)
  }
}

let accessToken: string | null = null
let onSessionExpired: (() => void) | null = null
let refreshing: Promise<string | null> | null = null

export const session = {
  get accessToken() {
    return accessToken
  },
  async store(t: TokenResponse) {
    accessToken = t.accessToken
    await secureStorage.set(REFRESH_KEY, t.refreshToken)
  },
  async clear() {
    accessToken = null
    await secureStorage.remove(REFRESH_KEY)
  },
  refreshToken: () => secureStorage.get(REFRESH_KEY),
  onExpired(fn: () => void) {
    onSessionExpired = fn
  },
}

/** Single-flight token refresh: concurrent 401s share one refresh call. */
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    const refresh = await secureStorage.get(REFRESH_KEY)
    if (!refresh) return null
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) await session.clear()
        return null
      }
      const t = (await res.json()) as TokenResponse
      await session.store(t)
      return t.accessToken
    } catch {
      return null // offline: keep the refresh token for later
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

type Query = Record<string, string | number | undefined | null>

interface RequestOptions {
  method?: string
  body?: unknown
  form?: FormData
  query?: Query
  raw?: boolean
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { code?: string; message?: string; fieldErrors?: { field: string; message: string }[] }
    return new ApiError(body.message ?? `Request failed (${res.status})`, body.code ?? 'ERROR', res.status, body.fieldErrors ?? [])
  } catch {
    return new ApiError(`Request failed (${res.status})`, 'ERROR', res.status)
  }
}

export async function request<T>(path: string, opts: RequestOptions = {}, retried = false): Promise<T> {
  const qs = opts.query
    ? '?' +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}${qs}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    })
  } catch {
    throw new ApiError('Cannot reach the server. Check the connection and try again.', 'NETWORK', 0)
  }

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    const token = await refreshAccessToken()
    if (token) return request<T>(path, opts, true)
    onSessionExpired?.()
  }
  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  return (opts.raw ? res : res.json()) as Promise<T>
}

export const authApi = {
  login: (username: string, password: string) =>
    request<TokenResponse>('/auth/login', { method: 'POST', body: { username, password } }),
  logout: (refreshToken: string) => request<void>('/auth/logout', { method: 'POST', body: { refreshToken } }),
  me: () => request<User>('/auth/me'),
}

export const driverApi = {
  search: (query: Query) => request<Page<Driver>>('/drivers', { query }),
  get: (id: number) => request<Driver>(`/drivers/${id}`),
  create: (d: DriverInput) => request<Driver>('/drivers', { method: 'POST', body: d }),
  checkNid: (nid: string) => request<{ exists: boolean; driver: DriverSummary | null }>('/drivers/check-nid', { query: { nid } }),
}

export const ownerApi = {
  search: (query: Query) => request<Page<Owner>>('/owners', { query }),
  create: (o: OwnerInput) => request<Owner>('/owners', { method: 'POST', body: o }),
}

export const rickshawApi = {
  search: (query: Query) => request<Page<Rickshaw>>('/rickshaws', { query }),
  get: (id: number) => request<Rickshaw>(`/rickshaws/${id}`),
  byNumber: (n: string) => request<Rickshaw>(`/rickshaws/by-number/${encodeURIComponent(n)}`),
  create: (r: RickshawInput) => request<Rickshaw>('/rickshaws', { method: 'POST', body: r }),
  history: (id: number) => request<Assignment[]>(`/rickshaws/${id}/assignments`),
}

export const photoApi = {
  url: (id: string) => `${API_BASE}/photos/${id}`,
  upload: (form: FormData) => request<{ id: string }>('/photos', { method: 'POST', form }).then((r) => r.id),
}
