import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  captureServerExceptionMock,
  confirmPlaceSubmissionMock,
  checkUserScopedRateLimitMock,
  findActiveAppSessionByIdMock,
  getAuthenticatedSessionMock,
  createPlaceSubmissionMock,
  isValidCsrfTokenPairMock,
  preparePlaceEntryFromDraftMock,
  readCsrfTokenFromCookieHeaderMock,
  readCsrfTokenFromHeadersMock,
  readSessionIdFromCookieHeaderMock,
} = vi.hoisted(() => ({
  captureServerExceptionMock: vi.fn(),
  confirmPlaceSubmissionMock: vi.fn(),
  checkUserScopedRateLimitMock: vi.fn(),
  findActiveAppSessionByIdMock: vi.fn(),
  getAuthenticatedSessionMock: vi.fn(),
  createPlaceSubmissionMock: vi.fn(),
  isValidCsrfTokenPairMock: vi.fn(),
  preparePlaceEntryFromDraftMock: vi.fn(),
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

vi.mock('../server-core/place/placeEntryService.js', () => ({
  preparePlaceEntryFromDraft: preparePlaceEntryFromDraftMock,
}))

vi.mock('../server-core/place/placeSubmissionService.js', () => ({
  confirmPlaceSubmission: confirmPlaceSubmissionMock,
  createPlaceSubmission: createPlaceSubmissionMock,
}))

vi.mock('../server-core/http/requestRateLimit.js', () => ({
  checkUserScopedRateLimit: checkUserScopedRateLimitMock,
}))

vi.mock('../server-core/runtime/sentry.js', () => ({
  captureServerException: captureServerExceptionMock,
  initServerSentry: vi.fn(),
}))

import confirmHandler from '../../api/place-submissions/[submissionId]/confirmations.js'
import createHandler from '../../api/place-submissions/index.js'

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

describe('canonical place submission routes', () => {
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

  it('returns 429 when POST /api/place-submissions rate limit is exceeded', async () => {
    checkUserScopedRateLimitMock.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 9,
    })

    const { response, state } = createResponse()
    await createHandler({
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'csrf-123',
      },
      body: {
        name: '등록 테스트 장소',
        roadAddress: '서울 마포구 등록로 1',
      },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(429)
    expect(state.body).toEqual({
      error: {
        code: 'rate_limited',
        message: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.',
        retryAfterSeconds: 9,
      },
    })
    expect(createPlaceSubmissionMock).not.toHaveBeenCalled()
    expect(captureServerExceptionMock).not.toHaveBeenCalled()
  })

  it('returns 401 when POST /api/place-submissions is missing a session', async () => {
    readSessionIdFromCookieHeaderMock.mockReturnValue(null)

    const { response, state } = createResponse()
    await createHandler({
      method: 'POST',
      headers: {},
      body: {
        name: '등록 테스트 장소',
        roadAddress: '서울 마포구 등록로 1',
      },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(401)
    expect(state.body).toEqual({
      error: {
        code: 'unauthorized',
        message: 'Unauthorized',
      },
    })
    expect(checkUserScopedRateLimitMock).not.toHaveBeenCalled()
    expect(createPlaceSubmissionMock).not.toHaveBeenCalled()
  })

  it('returns a JSON 500 error when canonical place submission preparation throws unexpectedly', async () => {
    preparePlaceEntryFromDraftMock.mockRejectedValue(new Error('vercel runtime import failed'))

    const request = {
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'csrf-123',
      },
      body: {
      name: '등록 테스트 장소',
      roadAddress: '서울 마포구 등록로 1',
      placeType: 'restaurant',
      zeropayStatus: 'available',
      ratingScore: 5,
      reviewContent: '',
    },
  } as unknown as VercelRequest

    const { response, state } = createResponse()

    await createHandler(request, response)

    expect(preparePlaceEntryFromDraftMock).toHaveBeenCalledWith({
      name: '등록 테스트 장소',
      roadAddress: '서울 마포구 등록로 1',
      landLotAddress: null,
    })
    expect(state.statusCode).toBe(500)
    expect(state.body).toEqual({
      error: {
        code: 'internal_error',
        message: '등록하지 못했어요. 잠시 후 다시 시도해 주세요.',
      },
    })
    expect(captureServerExceptionMock).toHaveBeenCalledWith({
      error: expect.any(Error),
      req: request,
      route: '/api/place-submissions',
      user: {
        id: 'user-1',
        email: 'tester@nurimedia.co.kr',
        name: '테스트 사용자',
      },
    })
  })

  it('returns confirm_required with submissionId on POST /api/place-submissions', async () => {
    preparePlaceEntryFromDraftMock.mockResolvedValue({
      status: 'success',
      data: {
        naver_place_id: '10002',
        canonical_url: 'https://map.naver.com/p/entry/place/10002',
        name: '양화로 카페 리프레시',
        road_address: '서울 마포구 양화로19길 20 2층',
        land_lot_address: null,
        representative_address: '서울 마포구 양화로19길 20 2층',
        latitude: 37.55,
        longitude: 126.92,
        coordinate_source: 'naver',
      },
    })
    createPlaceSubmissionMock.mockResolvedValue({
      status: 'confirm_required',
      reason: 'merge_place',
      place: { id: 'place-cafe-1' },
      confirmMessage: '이미 등록된 장소예요. 지금 입력한 정보를 이 장소에 반영할까요?',
      submission: {
        id: 'submission-123',
        expiresAt: '2026-03-27T12:00:00.000Z',
      },
    })

    const request = {
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'csrf-123',
      },
      body: {
        name: '양화로 카페 리프레시',
        roadAddress: '서울 마포구 양화로19길 20 2층',
        placeType: 'cafe',
        zeropayStatus: 'available',
        ratingScore: 4,
        reviewContent: '병합 테스트 리뷰',
      },
    } as unknown as VercelRequest

    const { response, state } = createResponse()
    await createHandler(request, response)

    expect(checkUserScopedRateLimitMock).toHaveBeenCalledWith({
      scope: 'place-entry',
      key: 'user-1',
      limit: 6,
      windowMs: 60_000,
    })
    expect(state.statusCode).toBe(409)
    expect(createPlaceSubmissionMock).toHaveBeenCalledWith({
      userId: 'user-1',
      draft: {
        place_type: 'cafe',
        zeropay_status: 'available',
        rating_score: 4,
        review_content: '병합 테스트 리뷰',
      },
      lookupData: expect.objectContaining({
        naver_place_id: '10002',
      }),
    })
    expect(state.body).toEqual({
      status: 'confirm_required',
      reason: 'merge_place',
      place: { id: 'place-cafe-1' },
      confirmMessage: '이미 등록된 장소예요. 지금 입력한 정보를 이 장소에 반영할까요?',
      submission: {
        id: 'submission-123',
        expiresAt: '2026-03-27T12:00:00.000Z',
      },
      submissionId: 'submission-123',
    })
  })

  it('returns submission_invalid when POST /api/place-submissions/:submissionId/confirmations fails validation', async () => {
    confirmPlaceSubmissionMock.mockResolvedValue({
      status: 'error',
      code: 'submission_invalid',
      message: '확인 요청이 만료되었어요. 다시 시도해 주세요.',
    })

    const { response, state } = createResponse()
    await confirmHandler({
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'csrf-123',
      },
      query: {
        submissionId: 'submission-123',
      },
    } as unknown as VercelRequest, response)

    expect(confirmPlaceSubmissionMock).toHaveBeenCalledWith({
      submissionId: 'submission-123',
      userId: 'user-1',
    })
    expect(state.statusCode).toBe(409)
    expect(state.body).toEqual({
      error: {
        code: 'submission_invalid',
        message: '확인 요청이 만료되었어요. 다시 시도해 주세요.',
      },
    })
    expect(captureServerExceptionMock).not.toHaveBeenCalled()
  })

  it('returns 403 when POST /api/place-submissions/:submissionId/confirmations has an invalid csrf pair', async () => {
    isValidCsrfTokenPairMock.mockReturnValue(false)

    const { response, state } = createResponse()
    await confirmHandler({
      method: 'POST',
      headers: {
        cookie: '__Host-nurimap_session=session-123; nurimap_csrf=csrf-123',
        'x-nurimap-csrf-token': 'bad-csrf-token',
      },
      query: {
        submissionId: 'submission-123',
      },
    } as unknown as VercelRequest, response)

    expect(state.statusCode).toBe(403)
    expect(state.body).toEqual({
      error: {
        code: 'csrf_invalid',
        message: 'Invalid CSRF token.',
      },
    })
    expect(confirmPlaceSubmissionMock).not.toHaveBeenCalled()
    expect(checkUserScopedRateLimitMock).not.toHaveBeenCalled()
  })
})
