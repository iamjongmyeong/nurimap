import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  findActiveAppSessionByIdMock,
  getAuthenticatedSessionMock,
  isValidCsrfTokenPairMock,
  persistPlaceRegistrationMock,
  preparePlaceEntryFromDraftMock,
  readCsrfTokenFromCookieHeaderMock,
  readCsrfTokenFromHeadersMock,
  readSessionIdFromCookieHeaderMock,
} = vi.hoisted(() => ({
  findActiveAppSessionByIdMock: vi.fn(),
  getAuthenticatedSessionMock: vi.fn(),
  isValidCsrfTokenPairMock: vi.fn(),
  persistPlaceRegistrationMock: vi.fn(),
  preparePlaceEntryFromDraftMock: vi.fn(),
  readCsrfTokenFromCookieHeaderMock: vi.fn(),
  readCsrfTokenFromHeadersMock: vi.fn(),
  readSessionIdFromCookieHeaderMock: vi.fn(),
}))

vi.mock('../../api/_lib/_authService.js', () => ({
  getAuthenticatedSession: getAuthenticatedSessionMock,
}))

vi.mock('../../api/_lib/_appSessionService.js', () => ({
  findActiveAppSessionById: findActiveAppSessionByIdMock,
  isValidCsrfTokenPair: isValidCsrfTokenPairMock,
  readCsrfTokenFromCookieHeader: readCsrfTokenFromCookieHeaderMock,
  readCsrfTokenFromHeaders: readCsrfTokenFromHeadersMock,
  readSessionIdFromCookieHeader: readSessionIdFromCookieHeaderMock,
}))

vi.mock('../../api/_lib/_placeEntryService.js', () => ({
  preparePlaceEntryFromDraft: preparePlaceEntryFromDraftMock,
}))

vi.mock('../../api/_lib/_placeDataService.js', () => ({
  persistPlaceRegistration: persistPlaceRegistrationMock,
}))

import handler from '../../api/place-entry.js'

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

describe('/api/place-entry', () => {
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
  })

  it('returns a JSON 500 error when place-entry preparation throws unexpectedly', async () => {
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

    await handler(request, response)

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
  })

  it('returns confirm_required when backend persistence asks for duplicate confirmation', async () => {
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
    persistPlaceRegistrationMock.mockResolvedValue({
      status: 'confirm_required',
      reason: 'merge_place',
      place: { id: 'place-cafe-1' },
      confirmMessage: '이미 등록된 장소예요. 지금 입력한 정보를 이 장소에 반영할까요?',
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
        confirmDuplicate: false,
      },
    } as unknown as VercelRequest

    const { response, state } = createResponse()
    await handler(request, response)

    expect(state.statusCode).toBe(409)
    expect(persistPlaceRegistrationMock).toHaveBeenCalledWith({
      userId: 'user-1',
      confirmDuplicate: false,
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
  })
})
