import { describe, expect, it } from 'vitest'
import {
  confirmPlaceRegistration,
  createInitialPlaces,
  preparePlaceRegistration,
  registerOrMergePlace,
  submitReviewForPlace,
  validateRegistrationDraft,
  validateReviewDraft,
} from './placeRepository'

const baseLookupData = {
  naver_place_id: '123456789',
  canonical_url: 'https://map.naver.com/p/entry/place/123456789',
  name: '새 장소',
  road_address: '서울 마포구 테스트로 1',
  land_lot_address: '서울 마포구 테스트동 1-1',
  representative_address: '서울 마포구 테스트로 1',
  latitude: 37.55,
  longitude: 126.92,
  coordinate_source: 'naver' as const,
}

describe('Plan 06 place repository', () => {
  it('creates a new place when the naver_place_id is new', () => {
    const result = registerOrMergePlace({
      places: createInitialPlaces(),
      lookupData: baseLookupData,
      draft: {
        place_type: 'restaurant',
        zeropay_status: 'available',
        rating_score: 5,
        review_content: '새 장소 리뷰',
      },
    })

    expect(result.status).toBe('created')
    expect(result.place.my_review?.content).toBe('새 장소 리뷰')
  })

  it('merges into an existing place when the naver_place_id already exists', () => {
    const result = registerOrMergePlace({
      places: createInitialPlaces(),
      lookupData: {
        ...baseLookupData,
        naver_place_id: '10002',
        canonical_url: 'https://map.naver.com/p/entry/place/10002',
        name: '양화로 카페 리프레시',
      },
      draft: {
        place_type: 'cafe',
        zeropay_status: 'available',
        rating_score: 4,
        review_content: '추가 리뷰',
      },
    })

    expect(result.status).toBe('merged')
    expect(result.place.name).toBe('양화로 카페 리프레시')
    expect(result.place.review_count).toBeGreaterThan(2)
  })

  it('prefers the latest extracted fields for name, address, and coordinates', () => {
    const result = registerOrMergePlace({
      places: createInitialPlaces(),
      lookupData: {
        ...baseLookupData,
        naver_place_id: '10002',
        canonical_url: 'https://map.naver.com/p/entry/place/10002',
        name: '최신 이름',
        road_address: '최신 주소',
        latitude: 35.1,
        longitude: 128.1,
      },
      draft: {
        place_type: 'cafe',
        zeropay_status: 'available',
        rating_score: 4,
        review_content: '추가 리뷰',
      },
    })

    expect(result.place.name).toBe('최신 이름')
    expect(result.place.road_address).toBe('최신 주소')
    expect(result.place.latitude).toBe(35.1)
  })

  it('prefers confirmed zeropay status over needs_verification', () => {
    const result = registerOrMergePlace({
      places: createInitialPlaces(),
      lookupData: {
        ...baseLookupData,
        naver_place_id: '10002',
        canonical_url: 'https://map.naver.com/p/entry/place/10002',
      },
      draft: {
        place_type: 'cafe',
        zeropay_status: 'available',
        rating_score: 4,
        review_content: '추가 리뷰',
      },
    })

    expect(result.place.zeropay_status).toBe('available')
  })

  it('requires a single confirm when a duplicate place is found by canonical name and address', () => {
    const result = preparePlaceRegistration({
      places: createInitialPlaces(),
      lookupData: {
        ...baseLookupData,
        naver_place_id: '99999',
        canonical_url: 'https://map.naver.com/p/entry/place/99999',
        name: ' 양화로   카페 ',
        road_address: '서울 마포구 양화로19길 20 2층',
      },
    })

    expect(result.status).toBe('confirm_required')
    if (result.status !== 'confirm_required') {
      throw new Error('expected confirm_required result')
    }

    expect(result.reason).toBe('merge_place')
    expect(result.place.id).toBe('place-cafe-1')
    expect(result.confirmMessage).toBe('이미 등록된 장소예요. 지금 입력한 정보를 이 장소에 반영할까요?')
  })

  it('requires an overwrite confirm when my review already exists on the duplicate place', () => {
    const result = preparePlaceRegistration({
      places: createInitialPlaces(),
      lookupData: {
        ...baseLookupData,
        naver_place_id: '10001',
        canonical_url: 'https://map.naver.com/p/entry/place/10001',
        name: '누리 식당',
        road_address: '서울 마포구 양화로19길 22-16 1층',
      },
    })

    expect(result.status).toBe('confirm_required')
    if (result.status !== 'confirm_required') {
      throw new Error('expected confirm_required result')
    }

    expect(result.reason).toBe('overwrite_review')
    expect(result.place.id).toBe('place-restaurant-1')
    expect(result.confirmMessage).toBe('이미 내가 리뷰를 남긴 장소예요. 지금 입력한 정보를 반영할까요?')
  })

  it('applies a confirmed duplicate merge and keeps review uniqueness when my review is absent', () => {
    const result = confirmPlaceRegistration({
      places: createInitialPlaces(),
      lookupData: {
        ...baseLookupData,
        naver_place_id: '10002',
        canonical_url: 'https://map.naver.com/p/entry/place/10002',
        name: '양화로 카페 리프레시',
        road_address: '서울 마포구 양화로19길 20 2층',
        latitude: 35.1,
        longitude: 128.1,
      },
      draft: {
        place_type: 'restaurant',
        zeropay_status: 'available',
        rating_score: 4,
        review_content: '중복 병합 리뷰',
      },
    })

    expect(result.status).toBe('merged')
    expect(result.place.id).toBe('place-cafe-1')
    expect(result.place.review_count).toBe(9)
    expect(result.place.my_review?.content).toBe('중복 병합 리뷰')
    expect(result.place.place_type).toBe('restaurant')
    expect(result.place.zeropay_status).toBe('available')
    expect(result.place.latitude).toBe(35.1)
    expect(result.place.reviews[0]?.content).toBe('중복 병합 리뷰')
  })

  it('overwrites my existing review after confirm and preserves old review text when the new text is blank', () => {
    const result = confirmPlaceRegistration({
      places: createInitialPlaces(),
      lookupData: {
        ...baseLookupData,
        naver_place_id: '10001',
        canonical_url: 'https://map.naver.com/p/entry/place/10001',
        name: '누리 식당 리프레시',
        road_address: '서울 마포구 양화로19길 22-16 1층',
        latitude: 37.561,
        longitude: 126.924,
      },
      draft: {
        place_type: 'cafe',
        zeropay_status: 'needs_verification',
        rating_score: 4,
        review_content: '   ',
      },
    })

    expect(result.status).toBe('updated')
    expect(result.place.id).toBe('place-restaurant-1')
    expect(result.place.review_count).toBe(12)
    expect(result.place.my_review?.content).toBe('점심 모임으로 가기 좋은 식당이에요.')
    expect(result.place.my_review?.rating_score).toBe(4)
    expect(result.place.average_rating).toBe(4.6)
    expect(result.place.place_type).toBe('cafe')
    expect(result.place.zeropay_status).toBe('available')
    expect(result.place.name).toBe('누리 식당 리프레시')
    expect(result.place.latitude).toBe(37.561)
    expect(result.place.reviews[0]?.rating_score).toBe(4)
  })



  it('fails when rating is outside 1 to 5', () => {
    expect(
      validateRegistrationDraft({
        draft: {
          place_type: 'restaurant',
          zeropay_status: 'available',
          rating_score: 0,
          review_content: 'bad rating',
        },
        lookupData: { latitude: 37.5, longitude: 126.9 },
      }),
    ).toBe('별점은 1점에서 5점 사이여야 해요.')
  })

  it('fails when review length exceeds 500 characters', () => {
    expect(
      validateRegistrationDraft({
        draft: {
          place_type: 'restaurant',
          zeropay_status: 'available',
          rating_score: 5,
          review_content: 'a'.repeat(501),
        },
        lookupData: { latitude: 37.5, longitude: 126.9 },
      }),
    ).toBe('리뷰는 500자 이하로 입력해주세요.')
  })

  it('fails when coordinates are unavailable', () => {
    expect(
      validateRegistrationDraft({
        draft: {
          place_type: 'restaurant',
          zeropay_status: 'available',
          rating_score: 5,
          review_content: '좌표 없음',
        },
        lookupData: {},
      }),
    ).toBe('좌표를 확인한 뒤에만 등록할 수 있어요.')
  })

  it('returns the duplicate review modal result when my review already exists', () => {
    const result = registerOrMergePlace({
      places: createInitialPlaces(),
      lookupData: {
        ...baseLookupData,
        naver_place_id: '10001',
        canonical_url: 'https://map.naver.com/p/entry/place/10001',
      },
      draft: {
        place_type: 'restaurant',
        zeropay_status: 'available',
        rating_score: 5,
        review_content: '중복 리뷰',
      },
    })

    expect(result.status).toBe('existing_review')
    if (result.status !== 'existing_review') {
      throw new Error('expected existing_review result')
    }
    expect(result.message).toBe('이미 리뷰를 남긴 장소예요')
  })

  it('submits a review for a place without my review and updates aggregate summary fields', () => {
    const result = submitReviewForPlace({
      placeId: 'place-cafe-1',
      places: createInitialPlaces(),
      draft: {
        rating_score: 5,
        review_content: '새 리뷰 작성 테스트',
      },
    })

    expect(result.status).toBe('saved')
    if (result.status !== 'saved') {
      throw new Error('expected saved result')
    }

    expect(result.place.my_review?.content).toBe('새 리뷰 작성 테스트')
    expect(result.place.my_review?.author_name).toBe('테스트 사용자')
    expect(result.place.review_count).toBe(9)
    expect(result.place.average_rating).toBe(4.4)
    expect(result.place.reviews[0]?.content).toBe('새 리뷰 작성 테스트')
  })

  it('rejects a second review submission for the same place', () => {
    const result = submitReviewForPlace({
      placeId: 'place-restaurant-1',
      places: createInitialPlaces(),
      draft: {
        rating_score: 4,
        review_content: '이미 리뷰가 있는 장소',
      },
    })

    expect(result.status).toBe('existing_review')
    if (result.status !== 'existing_review') {
      throw new Error('expected existing_review result')
    }
    expect(result.message).toBe('이미 리뷰를 남긴 장소예요')
  })

  it('fails review validation when rating is outside 1 to 5', () => {
    expect(
      validateReviewDraft({
        rating_score: 0,
        review_content: 'bad rating',
      }),
    ).toBe('별점은 1점에서 5점 사이여야 해요.')
  })

})
