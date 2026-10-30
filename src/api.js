// Backend URL. On Vercel it is set with the VITE_API_URL environment variable.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

// Same formula as the backend: 1 token ~ 4 characters
export function estimateTokens(text) {
  if (!text || !text.trim()) return 0
  return Math.ceil(text.length / 4)
}

export class ApiError extends Error {
  constructor(status, body, retryAfter) {
    super(body?.message || `Error ${status}`)
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

export const api = {
  generate: (userId, prompt) =>
    request('/api/ai/generate', userId, { method: 'POST', body: JSON.stringify({ prompt }) }),
  status: (userId) => request('/api/quota/status', userId),
  history: (userId) => request('/api/quota/history', userId),
  upgrade: (userId, plan) =>
    request('/api/quota/upgrade', userId, { method: 'POST', body: JSON.stringify({ plan }) }),
}
