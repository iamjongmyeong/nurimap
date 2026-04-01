import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  checkUserScopedRateLimitMock,
  findActiveAppSessionByIdMock,
  getAuthenticatedSessionMock,
  isValidCsrfTokenPairMock,
  lookupPlaceFromRawUrlMock,
  readCsrfTokenFromCookieHeaderMock,
  readCsrfTokenFromHeadersMock,
  readSessionIdFromCookieHeaderMock,
} = vi.hoisted(() => ({
  checkUserScopedRateLimitMock: vi.fn(),
  findActiveAppSessionByIdMock: vi.fn(),
  getAuthenticatedSessionMock: vi.fn(),
  isValidCsrfTokenPairMock: vi.fn(),
  lookupPlaceFromRawUrlMock: vi.fn(),
  readCsrfTokenFromCookieHeaderMock: vi.fn(),
  readCsrfTokenFromHeadersMock: vi.fn(),
  readSessionIdFromCookieHeaderMock: vi.fn(),
}))

vi.mock('../server-core/auth/authService.js', () => ({
  getAuthenticatedSession: getAuthenticatedSessionMock,
}))

vi.mock('../server-core/auth/appSessionService.js', () => ({
  findActiveAppSessionById: findActiveAppSessionByIdMock,
  isValidCsrfTokenPair: isValidCsrfTokenPairMock,
  readCsrfTokenFromCookieHeader: readCsrfTokenFromCookieHeaderMock,
  readCsrfTokenFromHeaders: readCsrfTokenFromHeadersMock,
  readSessionIdFromCookieHeader: readSessionIdFromCookieHeaderMock,
}))

vi.mock('../server-core/place/placeLookupService.js', () => ({
  lookupPlaceFromRawUrl: lookupPlaceFromRawUrlMock,
}))

vi.mock('../server-core/http/requestRateLimit.js', () => ({
  checkUserScopedRateLimit: checkUserScopedRateLimitMock,
}))

import handler from '../../api/place-lookups/index.js'

const createResponse = () => {
  const state: { body?: unknown; statusCode?: number } = {}
  const response = {
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

describe('POST /api/place-lookups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readSessionIdFromCookieHeaderMock.mockReturnValue('session-123')
    findActiveAppSessionByIdMock.mockResolvedValue({
      id: 'session-123',
      csrf_token_hash: 'hashed',
    })
    readCsrfTokenFromCookieHeaderMock.mockReturnValue('csrf-123')
    readCsrfTokenFromHeadersMock.mockReturnValue('csrf-123')
    isValidCsrfTokenPairMock.mockReturnValue(true)
    getAuthenticatedSessionMock.mockResolvedValue({
      status: 'authenticated',
      sessionId: 'session-123',
      user: { id: 'user-1', email: 'tester@nurimedia.co.kr', name: '테스트 사용자' },
    })
    checkUserScopedRateLimitMock.mockReturnValue({
      allowed: true,
      retryAfterSeconds: null,
    })
  })

  it('returns 429 when place lookup rate limit is exceeded', async () => {
    checkUserScopedRateLimitMock.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 11,
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'csrf-123',
      },
      body: { rawUrl: 'https://map.naver.com/p/entry/place/123456789' },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(429)
    expect(state.body).toEqual({
      error: {
        code: 'rate_limited',
        message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
        retryAfterSeconds: 11,
      },
    })
    expect(lookupPlaceFromRawUrlMock).not.toHaveBeenCalled()
  })

  it('looks up a place when request is within the limit', async () => {
    lookupPlaceFromRawUrlMock.mockResolvedValue({
      status: 'success',
      data: {
        naver_place_id: '123456789',
        canonical_url: 'https://map.naver.com/p/entry/place/123456789',
        name: '누리 테스트 식당',
        road_address: '서울 마포구 테스트로 1',
        land_lot_address: null,
        representative_address: '서울 마포구 테스트로 1',
        latitude: 37.55,
        longitude: 126.92,
        coordinate_source: 'naver',
      },
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'csrf-123',
      },
      body: { rawUrl: 'https://map.naver.com/p/entry/place/123456789' },
    } as unknown as VercelRequest, response)

    expect(checkUserScopedRateLimitMock).toHaveBeenCalledWith({
      scope: 'place-lookup',
      key: 'user-1',
      limit: 12,
      windowMs: 60_000,
    })
    expect(state.statusCode).toBe(200)
  })

  it('returns 401 when the place lookup request is missing a session', async () => {
    readSessionIdFromCookieHeaderMock.mockReturnValue(null)

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {},
      body: { rawUrl: 'https://map.naver.com/p/entry/place/123456789' },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(401)
    expect(state.body).toEqual({
      error: {
        code: 'unauthorized',
        message: 'Unauthorized',
      },
    })
    expect(checkUserScopedRateLimitMock).not.toHaveBeenCalled()
    expect(lookupPlaceFromRawUrlMock).not.toHaveBeenCalled()
  })

  it('returns 403 when the place lookup request has an invalid csrf pair', async () => {
    isValidCsrfTokenPairMock.mockReturnValue(false)

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'bad-csrf-token',
      },
      body: { rawUrl: 'https://map.naver.com/p/entry/place/123456789' },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(403)
    expect(state.body).toEqual({
      error: {
        code: 'csrf_invalid',
        message: 'Invalid CSRF token.',
      },
    })
    expect(checkUserScopedRateLimitMock).not.toHaveBeenCalled()
    expect(lookupPlaceFromRawUrlMock).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid url lookup failures', async () => {
    lookupPlaceFromRawUrlMock.mockResolvedValue({
      status: 'error',
      error: {
        code: 'invalid_url',
        message: '네이버 지도 URL을 입력해주세요.',
      },
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'csrf-123',
      },
      body: { rawUrl: 'https://example.com/nope' },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(400)
  })

  it('returns 502 for upstream lookup failures', async () => {
    lookupPlaceFromRawUrlMock.mockResolvedValue({
      status: 'error',
      error: {
        code: 'lookup_failed',
        message: '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.',
      },
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'csrf-123',
      },
      body: { rawUrl: 'https://map.naver.com/p/entry/place/123456789' },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(502)
  })
})
