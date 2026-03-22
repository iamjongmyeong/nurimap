import { describe, expect, it, vi } from 'vitest'

import {
  APP_CSRF_COOKIE_NAME,
  APP_CSRF_HEADER_NAME,
  APP_SESSION_COOKIE_NAME,
  APP_SESSION_MAX_AGE_SECONDS,
  createAppSession,
  createAppSessionTokens,
  findActiveAppSessionById,
  getAppSessionExpiresAt,
  hashOpaqueToken,
  isValidCsrfTokenPair,
  readCsrfTokenFromCookieHeader,
  readCsrfTokenFromHeaders,
  readSessionIdFromCookieHeader,
  revokeAppSession,
  serializeAppSessionCookie,
  serializeClearedCsrfCookie,
  serializeClearedAppSessionCookie,
  serializeCsrfCookie,
  touchAppSession,
} from './appSessionService'

describe('appSessionService foundation', () => {
  it('creates opaque session and csrf tokens', () => {
    const tokens = createAppSessionTokens()

    expect(tokens.sessionId).toMatch(/^[A-Za-z0-9_-]{40,}$/)
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

  it('stores new sessions behind a surrogate row id and hashed token lookup', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      rows: [
        {
          id: 'db-session-1',
          user_id: 'user-1',
          csrf_token_hash: 'hashed-csrf',
          expires_at: '2026-06-20T00:00:00.000Z',
          revoked_at: null,
          created_at: '2026-03-22T00:00:00.000Z',
          updated_at: '2026-03-22T00:00:00.000Z',
          last_seen_at: '2026-03-22T00:00:00.000Z',
        },
      ],
    })
    const now = new Date('2026-03-22T00:00:00.000Z')

    await createAppSession({
      client: { query: queryMock } as never,
      csrfToken: 'csrf-123',
      now,
      sessionId: 'opaque-session-token',
      userId: 'user-1',
    })

    const [sql, parameters] = queryMock.mock.calls[0] as [string, unknown[]]
    const normalizedSql = sql.replace(/\s+/g, ' ').trim()

    expect(normalizedSql).toContain(
      'insert into public.app_sessions ( user_id, session_token_hash, csrf_token_hash, expires_at, last_seen_at ) values ($1, $2, $3, $4, $5)',
    )
    expect(parameters).toEqual([
      'user-1',
      hashOpaqueToken('opaque-session-token'),
      hashOpaqueToken('csrf-123'),
      '2026-06-20T00:00:00.000Z',
      '2026-03-22T00:00:00.000Z',
    ])
  })

  it('uses hash-first lookup with legacy row-id compatibility for read touch and revoke', async () => {
    const queryMock = vi.fn().mockResolvedValue({ rows: [] })
    const client = { query: queryMock } as never
    const now = new Date('2026-03-22T00:00:00.000Z')

    await findActiveAppSessionById({ client, sessionId: 'opaque-session-token' })
    await touchAppSession({ client, now, sessionId: 'opaque-session-token' })
    await revokeAppSession({ client, now, sessionId: 'opaque-session-token' })

    const lookupHash = hashOpaqueToken('opaque-session-token')
    const [findSql, findParams] = queryMock.mock.calls[0] as [string, unknown[]]
    const [touchSql, touchParams] = queryMock.mock.calls[1] as [string, unknown[]]
    const [revokeSql, revokeParams] = queryMock.mock.calls[2] as [string, unknown[]]

    expect(findSql.replace(/\s+/g, ' ')).toContain(
      'where (session_token_hash = $1 or id::text = $2)',
    )
    expect(findSql.replace(/\s+/g, ' ')).toContain(
      'order by case when session_token_hash = $1 then 0 else 1 end',
    )
    expect(findParams).toEqual([lookupHash, 'opaque-session-token'])

    expect(touchSql.replace(/\s+/g, ' ')).toContain(
      'where id = (select id from matched_session)',
    )
    expect(touchParams).toEqual([lookupHash, 'opaque-session-token', '2026-03-22T00:00:00.000Z'])

    expect(revokeSql.replace(/\s+/g, ' ')).toContain(
      'where id = (select id from matched_session)',
    )
    expect(revokeParams).toEqual([lookupHash, 'opaque-session-token', '2026-03-22T00:00:00.000Z'])
  })
})
