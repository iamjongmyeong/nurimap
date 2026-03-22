import { beforeEach, describe, expect, it } from 'vitest'
import {
  __getPlaceEntryCacheSizeForTests,
  __resetPlaceEntryCaches,
  preparePlaceEntryFromDraft,
} from './placeEntryService'

describe('placeEntryService', () => {
  beforeEach(() => {
    __resetPlaceEntryCaches()
  })

  it('geocodes the submitted road address before returning prepared place data', async () => {
    const result = await preparePlaceEntryFromDraft({
      name: '등록 테스트 장소',
      roadAddress: '서울 마포구 등록로 1',
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      throw new Error('expected success result')
    }

    expect(result.data.name).toBe('등록 테스트 장소')
    expect(result.data.road_address).toBe('서울 마포구 등록로 1')
    expect(result.data.coordinate_source).toBe('road_address_geocode')
    expect(result.data.latitude).toBe(37.558721)
    expect(result.data.canonical_url).toContain(encodeURIComponent('등록 테스트 장소 서울 마포구 등록로 1'))
  })

  it('falls back to land-lot geocoding when the road address misses', async () => {
    const result = await preparePlaceEntryFromDraft({
      name: '지번 fallback 테스트',
      roadAddress: '존재하지 않는 도로명 주소 99999',
      landLotAddress: '서울 마포구 지번테스트 35-1',
    })

    expect(result.status).toBe('success')
    if (result.status !== 'success') {
      throw new Error('expected success result')
    }

    expect(result.data.coordinate_source).toBe('land_lot_address_geocode')
    expect(result.data.latitude).toBe(37.556991)
  })

  it('returns coordinates_unavailable when both geocoding attempts fail', async () => {
    const result = await preparePlaceEntryFromDraft({
      name: '좌표 실패 장소',
      roadAddress: '존재하지 않는 도로명 주소 99999',
      landLotAddress: '존재하지 않는 지번 주소 99999',
    })

    expect(result).toEqual({
      status: 'error',
      error: {
        code: 'coordinates_unavailable',
        message: '주소를 찾지 못했어요. 입력한 주소를 다시 확인해 주세요.',
      },
    })
  })

  it('keeps the geocode cache bounded', async () => {
    for (let index = 0; index < 220; index += 1) {
      await preparePlaceEntryFromDraft({
        name: `좌표 실패 장소 ${index}`,
        roadAddress: `존재하지 않는 도로명 주소 ${index}`,
        landLotAddress: null,
      })
    }

    expect(__getPlaceEntryCacheSizeForTests()).toBeLessThanOrEqual(200)
  })
})
