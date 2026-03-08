import { normalizeNaverMapUrl } from './_naverUrl.js'
import { logPlaceLookupFailure } from './_opsLogger.js'
import { GEOCODE_FIXTURES, PLACE_LOOKUP_FIXTURES } from './_placeLookupFixtures.js'
import type { PlaceLookupError, PlaceLookupResult, PlaceLookupSourceRecord, PlaceLookupSuccess } from './_placeLookupTypes.js'

const LOOKUP_FAILED_MESSAGE = '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.'
const COORDINATES_FAILED_MESSAGE = '좌표를 확인하지 못했어요. 다시 시도해 주세요.'
const lookupResultCache = new Map<string, PlaceLookupResult>()
const geocodeCache = new Map<string, { latitude: number; longitude: number } | null>()

const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address) ?? null
  }

  if (GEOCODE_FIXTURES[address]) {
    const result = GEOCODE_FIXTURES[address]
    geocodeCache.set(address, result)
    return result
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY
  if (!restApiKey) {
    geocodeCache.set(address, null)
    return null
  }

  const response = await fetch(
    `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
    {
      headers: {
        Authorization: `KakaoAK ${restApiKey}`,
      },
    },
  )

  if (!response.ok) {
    geocodeCache.set(address, null)
    return null
  }

  const data = (await response.json()) as {
    documents?: Array<{ x: string; y: string }>
  }
  const firstDocument = data.documents?.[0]

  if (!firstDocument) {
    geocodeCache.set(address, null)
    return null
  }

  const result = {
    latitude: Number(firstDocument.y),
    longitude: Number(firstDocument.x),
  }
  geocodeCache.set(address, result)
  return result
}

const resolveCoordinates = async (record: PlaceLookupSourceRecord) => {
  if (record.latitude !== null && record.longitude !== null) {
    return {
      latitude: record.latitude,
      longitude: record.longitude,
      coordinate_source: 'naver' as const,
    }
  }

  if (record.road_address) {
    const roadResult = await geocodeAddress(record.road_address)
    if (roadResult) {
      return {
        ...roadResult,
        coordinate_source: 'road_address_geocode' as const,
      }
    }
  }

  if (record.land_lot_address) {
    const landLotResult = await geocodeAddress(record.land_lot_address)
    if (landLotResult) {
      return {
        ...landLotResult,
        coordinate_source: 'land_lot_address_geocode' as const,
      }
    }
  }

  return null
}

export const lookupPlaceFromRawUrl = async (rawUrl: string): Promise<PlaceLookupResult> => {
  const normalized = normalizeNaverMapUrl(rawUrl)
  if (lookupResultCache.has(normalized.canonicalUrl)) {
    return lookupResultCache.get(normalized.canonicalUrl) as PlaceLookupResult
  }
  const sourceRecord = PLACE_LOOKUP_FIXTURES[normalized.naverPlaceId]

  if (!sourceRecord) {
    const result: PlaceLookupError = {
      status: 'error',
      error: {
        code: 'lookup_failed',
        message: LOOKUP_FAILED_MESSAGE,
      },
    }
    logPlaceLookupFailure({ code: 'lookup_failed', naverPlaceId: normalized.naverPlaceId, rawUrl })
    return result
  }

  const coordinates = await resolveCoordinates(sourceRecord)

  if (!coordinates) {
    const result: PlaceLookupError = {
      status: 'error',
      error: {
        code: 'coordinates_unavailable',
        message: COORDINATES_FAILED_MESSAGE,
      },
    }
    logPlaceLookupFailure({ code: 'coordinates_unavailable', naverPlaceId: normalized.naverPlaceId, rawUrl })
    return result
  }

  const result: PlaceLookupSuccess = {
    status: 'success',
    data: {
      naver_place_id: sourceRecord.naver_place_id,
      canonical_url: sourceRecord.canonical_url,
      name: sourceRecord.name,
      road_address: sourceRecord.road_address,
      land_lot_address: sourceRecord.land_lot_address,
      representative_address: sourceRecord.road_address ?? sourceRecord.land_lot_address,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      coordinate_source: coordinates.coordinate_source,
    },
  }
  lookupResultCache.set(normalized.canonicalUrl, result)
  return result
}
