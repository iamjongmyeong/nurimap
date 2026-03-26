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

import handler from '../../api/place-review.js'

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

describe('/api/place-review', () => {
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
      headers: {},
      body: { placeId: 'place-1', ratingScore: 5, reviewContent: '새 리뷰', allowOverwrite: false },
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
})
