interface RateLimitEntry {
  count:     number
  resetAt:   number
}

const store = new Map<string, RateLimitEntry>()

setInterval(() => {
  const now = Date.now()
  store.forEach((v, k) => {
    if (v.resetAt < now) store.delete(k)
  })
}, 5 * 60 * 1000)

interface RateLimitOptions {
  limit:       number
  windowMs:    number
}

interface RateLimitResult {
  allowed:    boolean
  remaining:  number
  resetAt:    number
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {

    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

export function getIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

export const RATE_LIMITS = {
  login:    { limit: 10,  windowMs: 15 * 60 * 1000 },
  register: { limit: 5,   windowMs: 60 * 60 * 1000 },
  payment:  { limit: 10,  windowMs: 15 * 60 * 1000 },
  api:      { limit: 100, windowMs: 60 * 1000       },
}