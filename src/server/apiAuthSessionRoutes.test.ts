import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  findActiveAppSessionByIdMock,
  getAuthenticatedSessionMock,
  isValidCsrfTokenPairMock,
  readCsrfTokenFromCookieHeaderMock,
  readCsrfTokenFromHeadersMock,
  readSessionIdFromCookieHeaderMock,
  saveAuthenticatedUserNameMock,
  serializeClearedAppSessionCookieMock,
  serializeClearedCsrfCookieMock,
  signOutAppSessionMock,
} = vi.hoisted(() => ({
  findActiveAppSessionByIdMock: vi.fn(),
  getAuthenticatedSessionMock: vi.fn(),
  isValidCsrfTokenPairMock: vi.fn(),
  readCsrfTokenFromCookieHeaderMock: vi.fn(),
  readCsrfTokenFromHeadersMock: vi.fn(),
  readSessionIdFromCookieHeaderMock: vi.fn(),
  saveAuthenticatedUserNameMock: vi.fn(),
  serializeClearedAppSessionCookieMock: vi.fn(),
  serializeClearedCsrfCookieMock: vi.fn(),
  signOutAppSessionMock: vi.fn(),
}))

vi.mock('../server-core/auth/authService.js', () => ({
  getAuthenticatedSession: getAuthenticatedSessionMock,
  saveAuthenticatedUserName: saveAuthenticatedUserNameMock,
  signOutAppSession: signOutAppSessionMock,
}))

vi.mock('../server-core/auth/appSessionService.js', () => ({
  APP_CSRF_HEADER_NAME: 'x-nurimap-csrf-token',
  findActiveAppSessionById: findActiveAppSessionByIdMock,
  isValidCsrfTokenPair: isValidCsrfTokenPairMock,
  readCsrfTokenFromCookieHeader: readCsrfTokenFromCookieHeaderMock,
  readCsrfTokenFromHeaders: readCsrfTokenFromHeadersMock,
  readSessionIdFromCookieHeader: readSessionIdFromCookieHeaderMock,
  serializeClearedAppSessionCookie: serializeClearedAppSessionCookieMock,
  serializeClearedCsrfCookie: serializeClearedCsrfCookieMock,
}))

import profileHandler from '../../api/auth/profile.js'
import sessionHandler from '../../api/auth/session.js'

const createResponse = () => {
  const state: { body?: unknown; headers?: Record<string, unknown>; statusCode?: number } = {}
  const response = {
    setHeader: vi.fn((name: string, value: unknown) => {
      state.headers ??= {}
      state.headers[name] = value
      return response
    }),
    status: vi.fn((statusCode: number) => {
      state.statusCode = statusCode
      return response
    }),
    json: vi.fn((body: unknown) => {
      state.body = body
      return response
    }),
  }

  return {
    response: response as unknown as VercelResponse,
    state,
  }
}

describe('/api/auth session routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readSessionIdFromCookieHeaderMock.mockReturnValue('session-123')
    serializeClearedAppSessionCookieMock.mockReturnValue('nurimap_session=')
    serializeClearedCsrfCookieMock.mockReturnValue('nurimap_csrf=')
    signOutAppSessionMock.mockResolvedValue({ status: 'success' })
  })

  it('returns the authenticated session payload', async () => {
    getAuthenticatedSessionMock.mockResolvedValue({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'tester@nurimedia.co.kr',
        name: '테스트 사용자',
      },
      sessionId: 'session-123',
    })

    const { response, state } = createResponse()
    await sessionHandler({ method: 'GET', headers: {} } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(200)
    expect(state.headers?.['Cache-Control']).toEqual(expect.stringContaining('no-store'))
    expect(state.body).toEqual({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'tester@nurimedia.co.kr',
        name: '테스트 사용자',
      },
      csrfHeaderName: 'x-nurimap-csrf-token',
    })
  })

  it('returns missing sessions with explicit no-store cache headers', async () => {
    getAuthenticatedSessionMock.mockResolvedValue({ status: 'missing' })

    const { response, state } = createResponse()
    await sessionHandler({ method: 'GET', headers: {} } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(200)
    expect(state.headers?.['Cache-Control']).toEqual(expect.stringContaining('no-store'))
    expect(state.body).toEqual({ status: 'missing' })
  })

  it('requires csrf validation before DELETE /api/auth/session clears cookies', async () => {
    findActiveAppSessionByIdMock.mockResolvedValue({
      id: 'session-123',
      csrf_token_hash: 'hashed',
    })
    readCsrfTokenFromCookieHeaderMock.mockReturnValue('csrf-123')
    readCsrfTokenFromHeadersMock.mockReturnValue('csrf-123')
    isValidCsrfTokenPairMock.mockReturnValue(true)

    const { response, state } = createResponse()
    await sessionHandler({ method: 'DELETE', headers: {} } as unknown as VercelRequest, response)

    expect(signOutAppSessionMock).toHaveBeenCalledWith('session-123')
    expect(state.headers?.['Set-Cookie']).toEqual([
      'nurimap_session=',
      'nurimap_csrf=',
    ])
    expect(state.body).toEqual({ status: 'success' })
  })

  it('saves name through PATCH /api/auth/profile', async () => {
    findActiveAppSessionByIdMock.mockResolvedValue({
      id: 'session-123',
      csrf_token_hash: 'hashed',
    })
    readCsrfTokenFromCookieHeaderMock.mockReturnValue('csrf-123')
    readCsrfTokenFromHeadersMock.mockReturnValue('csrf-123')
    isValidCsrfTokenPairMock.mockReturnValue(true)
    getAuthenticatedSessionMock.mockResolvedValue({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'tester@nurimedia.co.kr',
        name: null,
      },
      sessionId: 'session-123',
    })
    saveAuthenticatedUserNameMock.mockResolvedValue({
      status: 'success',
      name: '홍길동',
    })

    const { response, state } = createResponse()
    await profileHandler({
      method: 'PATCH',
      headers: {},
      body: { name: '홍길동' },
    } as unknown as VercelRequest, response)

    expect(saveAuthenticatedUserNameMock).toHaveBeenCalledWith({
      userId: 'user-1',
      name: '홍길동',
    })
    expect(state.statusCode).toBe(200)
    expect(state.body).toEqual({
      status: 'success',
      name: '홍길동',
    })
  })

  it('rejects POST on /api/auth/profile so PATCH stays canonical', async () => {
    const { response, state } = createResponse()

    await profileHandler({
      method: 'POST',
      headers: {},
      body: { name: '홍길동' },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(405)
    expect(state.body).toEqual({
      error: {
        code: 'method_not_allowed',
        message: 'Method not allowed',
      },
    })
  })
})
