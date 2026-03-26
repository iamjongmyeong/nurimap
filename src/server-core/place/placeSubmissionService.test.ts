import { beforeEach, describe, expect, it, vi } from 'vitest'

const persistPlaceRegistrationMock = vi.hoisted(() => vi.fn())

vi.mock('./placeDataService.js', () => ({
  persistPlaceRegistration: persistPlaceRegistrationMock,
}))

import {
  __createPlaceSubmissionIdForTests,
  confirmPlaceSubmission,
  createPlaceSubmission,
  PLACE_SUBMISSION_INVALID_MESSAGE,
} from './placeSubmissionService'

const draft = {
  place_type: 'cafe',
  zeropay_status: 'available',
  rating_score: 5,
  review_content: '새 리뷰',
} as const

const lookupData = {
  naver_place_id: '10001',
  canonical_url: 'https://map.naver.com/p/entry/place/10001',
  name: '누리 카페',
  road_address: '서울 마포구 테스트로 1',
  land_lot_address: null,
  representative_address: '서울 마포구 테스트로 1',
  latitude: 37.55,
  longitude: 126.92,
  coordinate_source: 'naver',
} as const

describe('placeSubmissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a signed submission id for conflict flows and confirms with the same persisted payload', async () => {
    persistPlaceRegistrationMock
      .mockResolvedValueOnce({
        status: 'confirm_required',
        reason: 'merge_place',
        place: { id: 'place-1', name: '누리 카페' },
        confirmMessage: '이미 등록된 장소예요. 지금 입력한 정보를 이 장소에 반영할까요?',
      })
      .mockResolvedValueOnce({
        status: 'merged',
        place: { id: 'place-1', name: '누리 카페' },
        places: [{ id: 'place-1', name: '누리 카페' }],
        message: '기존 장소에 정보를 합쳤어요.',
      })

    const created = await createPlaceSubmission({
      userId: 'user-1',
      draft,
      lookupData,
      now: new Date('2026-03-27T00:00:00.000Z'),
    })

    expect(created.status).toBe('confirm_required')
    if (created.status !== 'confirm_required') {
      return
    }

    const confirmed = await confirmPlaceSubmission({
      submissionId: created.submission.id,
      userId: 'user-1',
      now: new Date('2026-03-27T00:05:00.000Z'),
    })

    expect(persistPlaceRegistrationMock).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      confirmDuplicate: false,
      draft,
      lookupData,
    })
    expect(persistPlaceRegistrationMock).toHaveBeenNthCalledWith(2, {
      userId: 'user-1',
      confirmDuplicate: true,
      draft,
      lookupData,
    })
    expect(confirmed).toEqual({
      status: 'merged',
      place: { id: 'place-1', name: '누리 카페' },
      places: [{ id: 'place-1', name: '누리 카페' }],
      message: '기존 장소에 정보를 합쳤어요.',
    })
  })

  it('rejects a submission id that belongs to a different user', async () => {
    const submission = __createPlaceSubmissionIdForTests({
      userId: 'user-1',
      draft,
      lookupData,
      now: new Date('2026-03-27T00:00:00.000Z'),
    })

    const result = await confirmPlaceSubmission({
      submissionId: submission.id,
      userId: 'user-2',
      now: new Date('2026-03-27T00:05:00.000Z'),
    })

    expect(result).toEqual({
      status: 'error',
      code: 'submission_invalid',
      message: PLACE_SUBMISSION_INVALID_MESSAGE,
    })
    expect(persistPlaceRegistrationMock).not.toHaveBeenCalled()
  })

  it('rejects an expired submission id', async () => {
    const submission = __createPlaceSubmissionIdForTests({
      userId: 'user-1',
      draft,
      lookupData,
      now: new Date('2026-03-27T00:00:00.000Z'),
    })

    const result = await confirmPlaceSubmission({
      submissionId: submission.id,
      userId: 'user-1',
      now: new Date('2026-03-27T00:16:00.000Z'),
    })

    expect(result).toEqual({
      status: 'error',
      code: 'submission_invalid',
      message: PLACE_SUBMISSION_INVALID_MESSAGE,
    })
    expect(persistPlaceRegistrationMock).not.toHaveBeenCalled()
  })
})
