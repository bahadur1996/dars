import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiError, TokenResponse } from './types'

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

const REFRESH_KEY = 'dars.refreshToken'

// The access token lives in memory only; the refresh token survives reloads.
let accessToken: string | null = null
let onSessionExpired: (() => void) | null = null

export const tokens = {
  get access() {
    return accessToken
  },
  get refresh() {
    try {
      return localStorage.getItem(REFRESH_KEY)
    } catch {
      return null
    }
  },
  set(t: Pick<TokenResponse, 'accessToken' | 'refreshToken'>) {
    accessToken = t.accessToken
    try {
      localStorage.setItem(REFRESH_KEY, t.refreshToken)
    } catch {
      /* storage unavailable: session lasts until reload */
    }
  },
  clear() {
    accessToken = null
    try {
      localStorage.removeItem(REFRESH_KEY)
    } catch {
      /* ignore */
    }
  },
}

export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn
}

export const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// Single-flight refresh: concurrent 401s wait for one refresh call.
let refreshing: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  const refresh = tokens.refresh
  if (!refresh) return Promise.resolve(null)
  refreshing ??= axios
    .post<TokenResponse>(`${API_BASE}/auth/refresh`, { refreshToken: refresh })
    .then((res) => {
      tokens.set(res.data)
      return res.data.accessToken
    })
    .catch(() => {
      tokens.clear()
      return null
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
  if (error.response?.status === 401 && original && !original._retried && !original.url?.includes('/auth/')) {
    original._retried = true
    const token = await refreshAccessToken()
    if (token) {
      original.headers.Authorization = `Bearer ${token}`
      return api(original)
    }
    onSessionExpired?.()
  }
  return Promise.reject(error)
})

/** Extracts the backend's ApiError body, or a generic error for network failures. */
export function apiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as Partial<ApiError> | undefined
    if (body && typeof body.message === 'string') {
      return { code: body.code ?? 'ERROR', message: body.message, fieldErrors: body.fieldErrors ?? [] }
    }
    if (!err.response) {
      return { code: 'NETWORK', message: 'Cannot reach the server. Check your connection and try again.', fieldErrors: [] }
    }
  }
  return { code: 'ERROR', message: 'Something went wrong. Try again.', fieldErrors: [] }
}
