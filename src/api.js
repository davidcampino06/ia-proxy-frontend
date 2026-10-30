// Backend URL. On Vercel it is set with the VITE_API_URL environment variable.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

// Same formula as the backend: 1 token ~ 4 characters
export function estimateTokens(text) {
  if (!text || !text.trim()) return 0
  return Math.ceil(text.length / 4)
}

export class ApiError extends Error {
  constructor(status, body, retryAfter) {
    super(body?.message || `Request failed with status ${status}`)
    this.status = status
    this.body = body
    this.retryAfter = retryAfter
  }
}

async function request(path, userId, options = {}) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new ApiError(0, { message: 'Could not reach the server. Check that the backend is online.' })
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const header = Number(res.headers.get('Retry-After'))
    const retryAfter = Number.isFinite(header) && header > 0 ? header : body?.retryAfterSeconds
    throw new ApiError(res.status, body, retryAfter)
  }
  return body
}

const post = (path, userId, body) =>
  request(path, userId, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

export const api = {
  generate: (userId, prompt) => post('/api/ai/generate', userId, { prompt }),
  status: (userId) => request('/api/quota/status', userId),
  history: (userId) => request('/api/quota/history', userId),
  upgrade: (userId, plan) => post('/api/quota/upgrade', userId, { plan }),
  plans: () => request('/api/plans', 'anonymous'),
  demo: {
    exhaustQuota: (userId) => post('/api/demo/exhaust-quota', userId),
    seedHistory: (userId) => post('/api/demo/seed-history', userId),
    reset: (userId) => post('/api/demo/reset', userId),
  },
}

// Plans used when /api/plans cannot be loaded
export const FALLBACK_PLANS = [
  { id: 'FREE', requestsPerMinute: 10, monthlyTokens: 50000, monthlyPriceUsd: 0 },
  { id: 'PRO', requestsPerMinute: 60, monthlyTokens: 500000, monthlyPriceUsd: 19 },
  { id: 'ENTERPRISE', requestsPerMinute: null, monthlyTokens: null, monthlyPriceUsd: 99 },
]

export const PLAN_ORDER = ['FREE', 'PRO', 'ENTERPRISE']
export const PLAN_NAMES = { FREE: 'Free', PRO: 'Pro', ENTERPRISE: 'Enterprise' }
export const PLAN_COLORS = { FREE: '#5B6B82', PRO: '#6C3BD1', ENTERPRISE: '#A86A0C' }

export const fmt = (n) => (n ?? 0).toLocaleString('en-US')
