import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { __resetPlaceLookupCaches, lookupPlaceFromRawUrl } from './placeLookupService'

const originalFetch = globalThis.fetch
const sprint13FavoriteUrl = 'https://map.naver.com/p/favorite/myPlace/folder/52f873516c87492794d35b0f62ebe0f1/place/1648359924?c=16.00,0,0,0,dh&at=a&placePath=/home?from=map&fromPanelNum=2&timestamp=202603122222&locale=ko&svcName=map_pcv5'
const sprint13SearchUrl = 'https://map.naver.com/p/search/%EC%A3%BC%EB%A7%89%EB%B3%B4%EB%A6%AC%EB%B0%A5/place/1648359924?c=15.95,0,0,0,dh&placePath=/home?bk_query=%EC%A3%BC%EB%A7%89%EB%B3%B4%EB%A6%AC%EB%B0%A5&entry=bmp&from=map&fromPanelNum=2&timestamp=202603122222&locale=ko&svcName=map_pcv5&searchText=%EC%A3%BC%EB%A7%89%EB%B3%B4%EB%A6%AC%EB%B0%A5'

describe('Plan 05 place lookup service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    __resetPlaceLookupCaches()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
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
    globalThis.fetch = vi.fn(async (input, init) => {
      if (String(input) === 'https://naver.me/I55a1Ogw') {
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

      return new Response(JSON.stringify({ documents: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }) as typeof fetch

    const result = await lookupPlaceFromRawUrl('https://naver.me/I55a1Ogw')

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.naver_place_id).toBe('1648359924')
      expect(result.data.canonical_url).toBe('https://map.naver.com/p/entry/place/1648359924')
      expect(result.data.name).toBe('주막보리밥')
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

  it('returns a coordinate failure when all coordinate strategies fail', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ documents: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch
    process.env.KAKAO_REST_API_KEY = 'test-rest-key'

    const result = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/567890123')

    expect(result).toEqual({
      status: 'error',
      error: {
        code: 'coordinates_unavailable',
        message: '좌표를 확인하지 못했어요. 다시 시도해 주세요.',
      },
    })
  })

  it('reuses cached lookup results for the same canonical URL', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ documents: [{ x: '126.925301', y: '37.557812' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as typeof fetch
    globalThis.fetch = fetchSpy
    process.env.KAKAO_REST_API_KEY = 'test-rest-key'

    const first = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/567890123')
    const second = await lookupPlaceFromRawUrl('https://map.naver.com/p/entry/place/567890123')

    expect(first.status).toBe('success')
    expect(second.status).toBe('success')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
