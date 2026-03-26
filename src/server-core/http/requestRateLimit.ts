type RateLimitEntry = {
  count: number
  resetAt: number
  touchedAt: number
}

const MAX_TRACKED_KEYS_PER_SCOPE = 500
const rateLimitScopes = new Map<string, Map<string, RateLimitEntry>>()

const pruneExpiredEntries = (store: Map<string, RateLimitEntry>, now: number) => {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

const evictOldestEntries = (store: Map<string, RateLimitEntry>) => {
  while (store.size > MAX_TRACKED_KEYS_PER_SCOPE) {
    const oldestKey = store.keys().next().value
    if (!oldestKey) {
      return
    }
    store.delete(oldestKey)
  }
}

const getScopeStore = (scope: string) => {
  const existing = rateLimitScopes.get(scope)
  if (existing) {
    return existing
  }

  const created = new Map<string, RateLimitEntry>()
  rateLimitScopes.set(scope, created)
  return created
}

export const checkUserScopedRateLimit = ({
  key,
  limit,
  now = Date.now(),
  scope,
  windowMs,
}: {
  key: string
  limit: number
  now?: number
  scope: string
  windowMs: number
}) => {
  const normalizedKey = key.trim()
  if (!normalizedKey) {
    return { allowed: true as const, retryAfterSeconds: null }
  }

  const store = getScopeStore(scope)
  pruneExpiredEntries(store, now)

  const current = store.get(normalizedKey)
  if (!current || current.resetAt <= now) {
    store.set(normalizedKey, {
      count: 1,
      resetAt: now + windowMs,
      touchedAt: now,
    })
    evictOldestEntries(store)
    return { allowed: true as const, retryAfterSeconds: null }
  }

  if (current.count >= limit) {
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  current.touchedAt = now
  store.delete(normalizedKey)
  store.set(normalizedKey, current)
  return { allowed: true as const, retryAfterSeconds: null }
}

export const __resetRateLimitStateForTests = () => {
  rateLimitScopes.clear()
}
