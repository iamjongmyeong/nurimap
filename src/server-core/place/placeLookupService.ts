import { NAVER_URL_ERROR_MESSAGE, normalizeNaverMapUrl } from '../../shared/naverUrl.js'
import { GEOCODE_FIXTURES, PLACE_LOOKUP_FIXTURES } from './placeLookupFixtures.js'
import { logPlaceLookupFailure } from '../runtime/opsLogger.js'
import type { PlaceLookupError, PlaceLookupResult, PlaceLookupSourceRecord, PlaceLookupSuccess } from '../../shared/placeLookupTypes.js'

const LOOKUP_FAILED_MESSAGE = '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.'
const COORDINATES_FAILED_MESSAGE = '좌표를 확인하지 못했어요. 다시 시도해 주세요.'
const PLACE_LOOKUP_CACHE_MAX_SIZE = 200
const PLACE_LOOKUP_CACHE_TTL_MS = 5 * 60 * 1000
const lookupResultCache = new Map<string, { cachedAt: number; value: PlaceLookupResult }>()
const geocodeCache = new Map<string, { cachedAt: number; value: { latitude: number; longitude: number } | null }>()

const readCachedValue = <T>(
  cache: Map<string, { cachedAt: number; value: T }>,
  key: string,
  now = Date.now(),
) => {
  const cached = cache.get(key)
  if (!cached) {
    return null
  }

  if (now - cached.cachedAt > PLACE_LOOKUP_CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }

  cache.delete(key)
  cache.set(key, cached)
  return cached.value
}

const writeCachedValue = <T>(
  cache: Map<string, { cachedAt: number; value: T }>,
  key: string,
  value: T,
  now = Date.now(),
) => {
  cache.delete(key)
  cache.set(key, {
    cachedAt: now,
    value,
  })

  while (cache.size > PLACE_LOOKUP_CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value
    if (!oldestKey) {
      return
    }
    cache.delete(oldestKey)
  }
}

const resolveLookupUrl = async (rawUrl: string) => {
  const parsedUrl = new URL(rawUrl)
  if (parsedUrl.hostname !== 'naver.me') {
    return rawUrl
  }

  const response = await fetch(rawUrl, {
    method: 'HEAD',
    redirect: 'manual',
  })
  const redirectedUrl = response.headers.get('location')

  if (!redirectedUrl) {
    throw new Error(NAVER_URL_ERROR_MESSAGE)
  }

  return new URL(redirectedUrl, rawUrl).toString()
}

const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
  const cached = readCachedValue(geocodeCache, address)
  if (cached !== null) {
    return cached
  }

  if (GEOCODE_FIXTURES[address]) {
    const result = GEOCODE_FIXTURES[address]
    writeCachedValue(geocodeCache, address, result)
    return result
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY
  if (!restApiKey) {
    writeCachedValue(geocodeCache, address, null)
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
    writeCachedValue(geocodeCache, address, null)
    return null
  }

  const data = (await response.json()) as {
    documents?: Array<{ x: string; y: string }>
  }
  const firstDocument = data.documents?.[0]

  if (!firstDocument) {
    writeCachedValue(geocodeCache, address, null)
    return null
  }

  const result = {
    latitude: Number(firstDocument.y),
    longitude: Number(firstDocument.x),
  }
  writeCachedValue(geocodeCache, address, result)
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
  const normalized = normalizeNaverMapUrl(await resolveLookupUrl(rawUrl))
  const cachedResult = readCachedValue(lookupResultCache, normalized.canonicalUrl)
  if (cachedResult) {
    return cachedResult
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
  writeCachedValue(lookupResultCache, normalized.canonicalUrl, result)
  return result
}

export const __resetPlaceLookupCaches = () => {
  lookupResultCache.clear()
  geocodeCache.clear()
}

export const __getPlaceLookupCacheSizesForTests = () => ({
  lookup: lookupResultCache.size,
  geocode: geocodeCache.size,
})

export const __primePlaceLookupCachesForTests = ({
  geocodeEntries = [],
  lookupEntries = [],
}: {
  geocodeEntries?: Array<{ key: string; value: { latitude: number; longitude: number } | null }>
  lookupEntries?: Array<{ key: string; value: PlaceLookupResult }>
}) => {
  for (const entry of geocodeEntries) {
    writeCachedValue(geocodeCache, entry.key, entry.value)
  }

  for (const entry of lookupEntries) {
    writeCachedValue(lookupResultCache, entry.key, entry.value)
  }
}
