import { describe, expect, it } from 'vitest'

import {
  APP_CSRF_COOKIE_NAME,
  APP_CSRF_HEADER_NAME,
  APP_SESSION_COOKIE_NAME,
  APP_SESSION_MAX_AGE_SECONDS,
  createAppSessionTokens,
  getAppSessionExpiresAt,
  hashOpaqueToken,
  isValidCsrfTokenPair,
  readCsrfTokenFromCookieHeader,
  readCsrfTokenFromHeaders,
  readSessionIdFromCookieHeader,
  serializeAppSessionCookie,
  serializeClearedCsrfCookie,
  serializeClearedAppSessionCookie,
  serializeCsrfCookie,
} from './appSessionService'

describe('appSessionService foundation', () => {
  it('creates opaque session and csrf tokens', () => {
    const tokens = createAppSessionTokens()

    expect(tokens.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(tokens.csrfToken.length).toBeGreaterThan(20)
  })

  it('hashes opaque tokens deterministically', () => {
    expect(hashOpaqueToken('same-token')).toBe(hashOpaqueToken('same-token'))
    expect(hashOpaqueToken('same-token')).not.toBe(hashOpaqueToken('different-token'))
  })

  it('serializes and clears the app session cookie with the expected policy', () => {
    const cookie = serializeAppSessionCookie({
      sessionId: 'session-123',
      secure: true,
    })

    expect(cookie).toContain(`${APP_SESSION_COOKIE_NAME}=session-123`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Path=/')
    expect(cookie).toContain(`Max-Age=${APP_SESSION_MAX_AGE_SECONDS}`)
    expect(cookie).toContain('Secure')

    const cleared = serializeClearedAppSessionCookie({ secure: true })
    expect(cleared).toContain(`${APP_SESSION_COOKIE_NAME}=`)
    expect(cleared).toContain('Max-Age=0')
  })

  it('reads the session id from a cookie header', () => {
    const cookieHeader = `foo=bar; ${APP_SESSION_COOKIE_NAME}=session-123; theme=dark`
    expect(readSessionIdFromCookieHeader(cookieHeader)).toBe('session-123')
    expect(readSessionIdFromCookieHeader('foo=bar')).toBeNull()
  })

  it('serializes and reads a csrf cookie', () => {
    const cookie = serializeCsrfCookie({
      csrfToken: 'csrf-123',
      secure: true,
    })

    expect(cookie).toContain(`${APP_CSRF_COOKIE_NAME}=csrf-123`)
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain(`Max-Age=${APP_SESSION_MAX_AGE_SECONDS}`)
    expect(readCsrfTokenFromCookieHeader(`foo=bar; ${APP_CSRF_COOKIE_NAME}=csrf-123`)).toBe('csrf-123')

    const cleared = serializeClearedCsrfCookie({ secure: true })
    expect(cleared).toContain(`${APP_CSRF_COOKIE_NAME}=`)
    expect(cleared).toContain('Max-Age=0')
  })

  it('reads csrf header values case-insensitively enough for node header maps', () => {
    expect(readCsrfTokenFromHeaders({ [APP_CSRF_HEADER_NAME]: 'csrf-123' })).toBe('csrf-123')
    expect(readCsrfTokenFromHeaders({ [APP_CSRF_HEADER_NAME.toUpperCase()]: 'csrf-456' })).toBe('csrf-456')
    expect(readCsrfTokenFromHeaders({})).toBeNull()
  })

  it('validates the csrf cookie/header pair against the stored hash', () => {
    expect(isValidCsrfTokenPair({
      cookieToken: 'csrf-123',
      headerToken: 'csrf-123',
      expectedHash: hashOpaqueToken('csrf-123'),
    })).toBe(true)

    expect(isValidCsrfTokenPair({
      cookieToken: 'csrf-123',
      headerToken: 'csrf-999',
      expectedHash: hashOpaqueToken('csrf-123'),
    })).toBe(false)
  })

  it('computes a 90-day absolute session expiry', () => {
    const now = new Date('2026-03-22T00:00:00.000Z')
    expect(getAppSessionExpiresAt(now).toISOString()).toBe('2026-06-20T00:00:00.000Z')
  })
})
