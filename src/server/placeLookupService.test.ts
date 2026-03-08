import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { lookupPlaceFromRawUrl } from './placeLookupService'

const originalFetch = globalThis.fetch

describe('Plan 05 place lookup service', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
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
})
