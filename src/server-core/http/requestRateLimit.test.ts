import { describe, expect, it } from 'vitest'

import { __resetRateLimitStateForTests, checkUserScopedRateLimit } from './requestRateLimit'

describe('requestRateLimit', () => {
  it('allows requests until the limit is reached and then returns retryAfterSeconds', () => {
    __resetRateLimitStateForTests()

    const first = checkUserScopedRateLimit({ key: 'user-1', limit: 2, now: 1_000, scope: 'place-entry', windowMs: 10_000 })
    const second = checkUserScopedRateLimit({ key: 'user-1', limit: 2, now: 2_000, scope: 'place-entry', windowMs: 10_000 })
    const third = checkUserScopedRateLimit({ key: 'user-1', limit: 2, now: 3_000, scope: 'place-entry', windowMs: 10_000 })

    expect(first).toEqual({ allowed: true, retryAfterSeconds: null })
    expect(second).toEqual({ allowed: true, retryAfterSeconds: null })
    expect(third.allowed).toBe(false)
    expect(third.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('resets the window after expiry', () => {
    __resetRateLimitStateForTests()

    checkUserScopedRateLimit({ key: 'user-1', limit: 1, now: 1_000, scope: 'place-lookup', windowMs: 1_000 })
    const afterReset = checkUserScopedRateLimit({ key: 'user-1', limit: 1, now: 2_100, scope: 'place-lookup', windowMs: 1_000 })

    expect(afterReset).toEqual({ allowed: true, retryAfterSeconds: null })
  })
})
