import type { PlaceLookupSourceRecord } from '../../shared/placeLookupTypes.js'

export const PLACE_LOOKUP_FIXTURES: Record<string, PlaceLookupSourceRecord> = {

  '10001': {
    naver_place_id: '10001',
    canonical_url: 'https://map.naver.com/p/entry/place/10001',
    name: '누리 식당',
    road_address: '서울 마포구 양화로19길 22-16 1층',
    land_lot_address: '서울 마포구 서교동 368-22',
    latitude: 37.55918,
    longitude: 126.92374,
  },
  '10002': {
    naver_place_id: '10002',
    canonical_url: 'https://map.naver.com/p/entry/place/10002',
    name: '양화로 카페 리프레시',
    road_address: '서울 마포구 양화로19길 20 2층',
    land_lot_address: '서울 마포구 서교동 369-10',
    latitude: 37.55831,
    longitude: 126.92518,
  },
  '123456789': {
    naver_place_id: '123456789',
    canonical_url: 'https://map.naver.com/p/entry/place/123456789',
    name: '누리 테스트 식당',
    road_address: '서울 마포구 양화로19길 22-16',
    land_lot_address: '서울 마포구 서교동 368-22',
    latitude: 37.558721,
    longitude: 126.92444,
  },
  '234567890': {
    naver_place_id: '234567890',
    canonical_url: 'https://map.naver.com/p/entry/place/234567890',
    name: '도로명 fallback 카페',
    road_address: '서울 마포구 테스트로 10',
    land_lot_address: '서울 마포구 테스트동 10-1',
    latitude: null,
    longitude: null,
  },
  '345678901': {
    naver_place_id: '345678901',
    canonical_url: 'https://map.naver.com/p/entry/place/345678901',
    name: '지번 fallback 식당',
    road_address: '도로명 없음 테스트',
    land_lot_address: '서울 마포구 지번테스트 35-1',
    latitude: null,
    longitude: null,
  },
  '1648359924': {
    naver_place_id: '1648359924',
    canonical_url: 'https://map.naver.com/p/entry/place/1648359924',
    name: '주막보리밥',
    road_address: '서울 마포구 성미산로 190-31',
    land_lot_address: '서울 마포구 연남동 240-34',
    latitude: 37.566123,
    longitude: 126.922345,
  },

  '678901234': {
    naver_place_id: '678901234',
    canonical_url: 'https://map.naver.com/p/entry/place/678901234',
    name: '저장 실패 장소',
    road_address: '서울 마포구 실패로 1',
    land_lot_address: '서울 마포구 실패동 1-1',
    latitude: 37.558123,
    longitude: 126.923456,
  },
  '567890123': {
    naver_place_id: '567890123',
    canonical_url: 'https://map.naver.com/p/entry/place/567890123',
    name: '좌표 실패 장소',
    road_address: '존재하지 않는 도로명 주소 99999',
    land_lot_address: '존재하지 않는 지번 주소 99999',
    latitude: null,
    longitude: null,
  },
}

export const GEOCODE_FIXTURES: Record<string, { latitude: number; longitude: number }> = {
  '서울 마포구 등록로 1': {
    latitude: 37.558721,
    longitude: 126.92444,
  },
  '서울 마포구 양화로19길 22-16 1층': {
    latitude: 37.55918,
    longitude: 126.92374,
  },
  '서울 마포구 양화로19길 20 2층': {
    latitude: 37.55831,
    longitude: 126.92518,
  },
  '서울 마포구 실패로 5': {
    latitude: 37.55651,
    longitude: 126.92641,
  },
  '서울 마포구 테스트로 10': {
    latitude: 37.557812,
    longitude: 126.925301,
  },
  '서울 마포구 지번테스트 35-1': {
    latitude: 37.556991,
    longitude: 126.923112,
  },
}
