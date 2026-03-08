import type { PlaceSummary } from './types'

export const MAP_INITIAL_CENTER = {
  latitude: 37.558721,
  longitude: 126.92444,
} as const

export const MOCK_PLACES: PlaceSummary[] = [
  {
    id: 'place-restaurant-1',
    naver_place_id: '10001',
    naver_place_url: 'https://map.naver.com/p/entry/place/10001',
    name: '누리 식당',
    road_address: '서울 마포구 양화로19길 22-16 1층',
    latitude: 37.55918,
    longitude: 126.92374,
    place_type: 'restaurant',
    zeropay_status: 'available',
    average_rating: 4.7,
    review_count: 12,
  },
  {
    id: 'place-cafe-1',
    naver_place_id: '10002',
    naver_place_url: 'https://map.naver.com/p/entry/place/10002',
    name: '양화로 카페',
    road_address: '서울 마포구 양화로19길 20 2층',
    latitude: 37.55831,
    longitude: 126.92518,
    place_type: 'cafe',
    zeropay_status: 'needs_verification',
    average_rating: 4.3,
    review_count: 8,
  },
  {
    id: 'place-restaurant-2',
    naver_place_id: '10003',
    naver_place_url: 'https://map.naver.com/p/entry/place/10003',
    name: '합정 점심집',
    road_address: '서울 마포구 양화로17길 15',
    latitude: 37.55794,
    longitude: 126.92488,
    place_type: 'restaurant',
    zeropay_status: 'unavailable',
    average_rating: 4.1,
    review_count: 5,
  },
  {
    id: 'place-no-coord',
    naver_place_id: '10004',
    naver_place_url: 'https://map.naver.com/p/entry/place/10004',
    name: '좌표 없는 테스트 장소',
    road_address: '서울 마포구 양화로19길 99',
    place_type: 'cafe',
    zeropay_status: 'available',
    average_rating: 3.8,
    review_count: 2,
  },
]

export const DEFAULT_SELECTED_PLACE_ID = MOCK_PLACES.find(
  (place) => place.latitude !== undefined && place.longitude !== undefined,
)?.id
