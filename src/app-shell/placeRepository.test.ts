import { describe, expect, it } from 'vitest'
import { createInitialPlaces, registerOrMergePlace, validateRegistrationDraft } from './placeRepository'

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
    expect(result.message).toBe('이미 리뷰를 남긴 장소예요')
  })
})
