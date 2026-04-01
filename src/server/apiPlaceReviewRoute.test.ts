import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  findActiveAppSessionByIdMock,
  getAuthenticatedSessionMock,
  isValidCsrfTokenPairMock,
  readCsrfTokenFromCookieHeaderMock,
  readCsrfTokenFromHeadersMock,
  readSessionIdFromCookieHeaderMock,
  submitPersistedPlaceReviewMock,
} = vi.hoisted(() => ({
  findActiveAppSessionByIdMock: vi.fn(),
  getAuthenticatedSessionMock: vi.fn(),
  isValidCsrfTokenPairMock: vi.fn(),
  readCsrfTokenFromCookieHeaderMock: vi.fn(),
  readCsrfTokenFromHeadersMock: vi.fn(),
  readSessionIdFromCookieHeaderMock: vi.fn(),
  submitPersistedPlaceReviewMock: vi.fn(),
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

vi.mock('../server-core/place/placeDataService.js', () => ({
  submitPersistedPlaceReview: submitPersistedPlaceReviewMock,
}))

import handler from '../../api/places/[placeId]/reviews/index.js'

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

describe('POST /api/places/:placeId/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    readSessionIdFromCookieHeaderMock.mockReturnValue('session-123')
    readCsrfTokenFromCookieHeaderMock.mockReturnValue('csrf-123')
    readCsrfTokenFromHeadersMock.mockReturnValue('csrf-123')
    isValidCsrfTokenPairMock.mockReturnValue(true)
    findActiveAppSessionByIdMock.mockResolvedValue({ id: 'session-123', csrf_token_hash: 'hashed' })
    getAuthenticatedSessionMock.mockResolvedValue({
      status: 'authenticated',
      sessionId: 'session-123',
      user: { id: 'user-1', email: 'tester@nurimedia.co.kr', name: '테스트 사용자' },
    })
  })

  it('submits a persisted review through cookie-auth', async () => {
    submitPersistedPlaceReviewMock.mockResolvedValue({
      status: 'saved',
      place: { id: 'place-1', name: '누리 식당' },
    })

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'csrf-123',
      },
      query: { placeId: 'place-1' },
      body: { ratingScore: 5, reviewContent: '새 리뷰' },
    } as unknown as VercelRequest, response)

    expect(submitPersistedPlaceReviewMock).toHaveBeenCalledWith({
      placeId: 'place-1',
      userId: 'user-1',
      allowOverwrite: false,
      draft: {
        rating_score: 5,
        review_content: '새 리뷰',
      },
    })
    expect(state.statusCode).toBe(200)
    expect(state.body).toEqual({
      status: 'saved',
      place: { id: 'place-1', name: '누리 식당' },
    })
  })

  it('returns 401 when the review request is missing a session', async () => {
    readSessionIdFromCookieHeaderMock.mockReturnValue(null)

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {},
      query: { placeId: 'place-1' },
      body: { ratingScore: 5, reviewContent: '새 리뷰' },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(401)
    expect(state.body).toEqual({
      error: {
        code: 'unauthorized',
        message: 'Unauthorized',
      },
    })
    expect(submitPersistedPlaceReviewMock).not.toHaveBeenCalled()
  })

  it('returns 403 when the review request has an invalid csrf pair', async () => {
    isValidCsrfTokenPairMock.mockReturnValue(false)

    const { response, state } = createResponse()
    await handler({
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'bad-csrf-token',
      },
      query: { placeId: 'place-1' },
      body: { ratingScore: 5, reviewContent: '새 리뷰' },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(403)
    expect(state.body).toEqual({
      error: {
        code: 'csrf_invalid',
        message: 'Invalid CSRF token.',
      },
    })
    expect(submitPersistedPlaceReviewMock).not.toHaveBeenCalled()
  })
})
