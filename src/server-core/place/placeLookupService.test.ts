import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  __getPlaceLookupCacheSizesForTests,
  __resetPlaceLookupCaches,
  lookupPlaceFromRawUrl,
} from './placeLookupService'

const originalFetch = globalThis.fetch
const originalKakaoRestApiKey = process.env.KAKAO_REST_API_KEY
const sprint13FavoriteUrl = 'https://map.naver.com/p/favorite/myPlace/folder/52f873516c87492794d35b0f62ebe0f1/place/1648359924?c=16.00,0,0,0,dh&at=a&placePath=/home?from=map&fromPanelNum=2&timestamp=202603122222&locale=ko&svcName=map_pcv5'
const sprint13SearchUrl = 'https://map.naver.com/p/search/%EC%A3%BC%EB%A7%89%EB%B3%B4%EB%A6%AC%EB%B0%A5/place/1648359924?c=15.95,0,0,0,dh&placePath=/home?bk_query=%EC%A3%BC%EB%A7%89%EB%B3%B4%EB%A6%AC%EB%B0%A5&entry=bmp&from=map&fromPanelNum=2&timestamp=202603122222&locale=ko&svcName=map_pcv5&searchText=%EC%A3%BC%EB%A7%89%EB%B3%B4%EB%A6%AC%EB%B0%A5'
const sprint22PinnedLocationShortUrl = 'https://naver.me/F2Lcl96n'

const createSummaryPayload = ({
  address = '서울 마포구 테스트동 1-1',
  latitude = 37.558721,
  longitude = 126.92444,
  name,
  placeId,
  roadAddress = '서울 마포구 테스트로 1',
}: {
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  name: string
  placeId: string
  roadAddress?: string | null
}) => ({
  data: {
    placeDetail: {
      id: placeId,
      name,
      coordinate: {
        latitude,
        longitude,
      },
      address: {
        address,
        roadAddress,
      },
    },
  },
})

describe('Plan 05 place lookup service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    __resetPlaceLookupCaches()
    process.env.NAVER_PLACE_LOOKUP_ALLOW_NETWORK_IN_TEST = 'true'
    delete process.env.KAKAO_REST_API_KEY
    globalThis.fetch = vi.fn(async (input, init) => {
      const url = String(input)

      if (url.includes('/p/api/place/summary/123456789')) {
        expect(init?.headers).toMatchObject({
          Referer: 'https://map.naver.com/p/entry/place/123456789',
        })
        return new Response(JSON.stringify(createSummaryPayload({
          placeId: '123456789',
          name: '누리 테스트 식당',
          roadAddress: '서울 마포구 양화로19길 22-16',
          address: '서울 마포구 서교동 368-22',
          latitude: 37.558721,
          longitude: 126.92444,
        })), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/p/api/place/summary/1648359924')) {
        return new Response(JSON.stringify(createSummaryPayload({
          placeId: '1648359924',
          name: '주막보리밥',
          roadAddress: '서울 마포구 성미산로 190-31',
          address: '서울 마포구 연남동 240-34',
          latitude: 37.566123,
          longitude: 126.922345,
        })), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/p/api/place/summary/1063954725')) {
        return new Response(JSON.stringify(createSummaryPayload({
          placeId: '1063954725',
          name: '수라간',
          roadAddress: '서울 마포구 양화로19길 22-16',
          address: '서울 마포구 서교동 368-22',
          latitude: 37.5619497,
          longitude: 126.9246381,
        })), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/p/api/place/summary/234567890')) {
        return new Response(JSON.stringify(createSummaryPayload({
          placeId: '234567890',
          name: '도로명 fallback 카페',
          roadAddress: '서울 마포구 테스트로 10',
          address: '서울 마포구 테스트동 10-1',
          latitude: null,
          longitude: null,
        })), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/p/api/place/summary/345678901')) {
        return new Response(JSON.stringify(createSummaryPayload({
          placeId: '345678901',
          name: '지번 fallback 식당',
          roadAddress: '도로명 없음 테스트',
          address: '서울 마포구 지번테스트 35-1',
          latitude: null,
          longitude: null,
        })), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/p/api/place/summary/456789012')) {
        return new Response(JSON.stringify({ error: { message: 'not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.includes('/p/api/place/summary/567890123')) {
        return new Response(JSON.stringify(createSummaryPayload({
          placeId: '567890123',
          name: '좌표 실패 장소',
          roadAddress: '존재하지 않는 도로명 주소 99999',
          address: '존재하지 않는 지번 주소 99999',
          latitude: null,
          longitude: null,
        })), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url === 'https://naver.me/I55a1Ogw') {
        expect(init).toMatchObject({
          method: 'HEAD',
          redirect: 'manual',
        })
        return new Response(null, {
          status: 307,
          headers: {
            Location: 'https://map.naver.com/p/entry/place/1648359924?placePath=%2Fhome',
          },
        })
      }

      if (url === sprint22PinnedLocationShortUrl) {
        expect(init).toMatchObject({
          method: 'HEAD',
          redirect: 'manual',
        })
        return new Response(null, {
          status: 307,
          headers: {
            Location: 'https://map.naver.com/?menu=location&lat=37.5619497&pinType=site&app=Y&version=2&appMenu=location&lng=126.9246381&title=%EC%88%98%EB%9D%BC%EA%B0%84&pinId=1063954725',
          },
        })
      }

      throw new Error(`unexpected request: ${url}`)
    }) as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete process.env.NAVER_PLACE_LOOKUP_ALLOW_NETWORK_IN_TEST
    if (originalKakaoRestApiKey === undefined) {
      delete process.env.KAKAO_REST_API_KEY
      return
    }
    process.env.KAKAO_REST_API_KEY = originalKakaoRestApiKey
  })

  it('returns fixture place data successfully', async () => {
    const result = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/123456789')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.name).toBe('누리 테스트 식당')
      expect(result.data.coordinate_source).toBe('naver')
    }
  })

  it('supports the Sprint 13 favorite url shape', async () => {
    const result = await lookupPlaceFromRawUrl(sprint13FavoriteUrl)

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.naver_place_id).toBe('1648359924')
      expect(result.data.canonical_url).toBe('https://map.naver.com/p/entry/place/1648359924')
      expect(result.data.name).toBe('주막보리밥')
    }
  })

  it('supports the Sprint 13 search url shape', async () => {
    const result = await lookupPlaceFromRawUrl(sprint13SearchUrl)

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.naver_place_id).toBe('1648359924')
      expect(result.data.canonical_url).toBe('https://map.naver.com/p/entry/place/1648359924')
      expect(result.data.name).toBe('주막보리밥')
    }
  })

  it('resolves the Sprint 13 naver short url before lookup', async () => {
    const result = await lookupPlaceFromRawUrl('https://naver.me/I55a1Ogw')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.naver_place_id).toBe('1648359924')
      expect(result.data.canonical_url).toBe('https://map.naver.com/p/entry/place/1648359924')
      expect(result.data.name).toBe('주막보리밥')
    }
  })

  it('supports naver short urls whose first redirect uses a pinId query', async () => {
    const result = await lookupPlaceFromRawUrl(sprint22PinnedLocationShortUrl)

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.naver_place_id).toBe('1063954725')
      expect(result.data.canonical_url).toBe('https://map.naver.com/p/entry/place/1063954725')
      expect(result.data.name).toBe('수라간')
    }
  })

  it('prefers naver coordinates when they exist', async () => {
    const result = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/123456789')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.latitude).toBe(37.558721)
      expect(result.data.coordinate_source).toBe('naver')
    }
  })

  it('falls back to road address geocoding', async () => {
    const result = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/234567890')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.coordinate_source).toBe('road_address_geocode')
      expect(result.data.latitude).toBe(37.557812)
    }
  })

  it('falls back to land lot address geocoding when road geocoding fails', async () => {
    const result = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/345678901')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.coordinate_source).toBe('land_lot_address_geocode')
      expect(result.data.latitude).toBe(37.556991)
    }
  })

  it('returns a lookup failure when source data is unavailable', async () => {
    const result = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/456789012')

    expect(result).toEqual({
      status: 'error',
      error: {
        code: 'lookup_failed',
        message: '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.',
      },
    })
  })

  it('still succeeds when coordinates remain unavailable after fallback attempts', async () => {
    const result = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/567890123')

    expect(result).toEqual({
      status: 'success',
      data: {
        naver_place_id: '567890123',
        canonical_url: 'https://map.naver.com/p/entry/place/567890123',
        name: '좌표 실패 장소',
        road_address: '존재하지 않는 도로명 주소 99999',
        land_lot_address: '존재하지 않는 지번 주소 99999',
        representative_address: '존재하지 않는 도로명 주소 99999',
        latitude: null,
        longitude: null,
        coordinate_source: 'unavailable',
      },
    })
  })

  it('reuses cached lookup results for the same canonical URL', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify(createSummaryPayload({
      placeId: '123456789',
      name: '누리 테스트 식당',
      roadAddress: '서울 마포구 양화로19길 22-16',
      address: '서울 마포구 서교동 368-22',
      latitude: 37.558721,
      longitude: 126.92444,
    })), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch
    globalThis.fetch = fetchSpy

    const first = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/123456789')
    const second = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/123456789')

    expect(first.status).toBe('success')
    expect(second.status).toBe('success')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps lookup and geocode caches bounded', async () => {
    for (let index = 0; index < 220; index += 1) {
      ;(globalThis.fetch as typeof fetch) = vi.fn(async () => new Response(JSON.stringify(createSummaryPayload({
        placeId: String(index),
        name: `장소 ${index}`,
        roadAddress: '서울 마포구 테스트로 1',
        address: '서울 마포구 테스트동 1-1',
        latitude: 37.55,
        longitude: 126.92,
      })), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch
      await lookupPlaceFromRawUrl(`https://map.naver.com/p/entry/place/${index}`)
    }

    expect(__getPlaceLookupCacheSizesForTests()).toEqual({
      geocode: 0,
      lookup: 200,
    })
  })
})
