import { NAVER_URL_ERROR_MESSAGE, normalizeNaverMapUrl } from '../../shared/naverUrl.js'
import { GEOCODE_FIXTURES, PLACE_LOOKUP_FIXTURES } from './placeLookupFixtures.js'
import { logPlaceLookupFailure } from '../runtime/opsLogger.js'
import type { PlaceLookupError, PlaceLookupResult, PlaceLookupSourceRecord, PlaceLookupSuccess } from '../../shared/placeLookupTypes.js'

const LOOKUP_FAILED_MESSAGE = '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.'
const REDIRECT_FAILED_MESSAGE = '네이버 링크를 열지 못했어요. 다시 시도해 주세요.'
const PLACE_LOOKUP_REQUEST_TIMEOUT_MS = 3_000
const PLACE_LOOKUP_REQUEST_DELAY_MS = 250
const PLACE_LOOKUP_CACHE_MAX_SIZE = 200
const PLACE_LOOKUP_CACHE_TTL_MS = 5 * 60 * 1000
const lookupResultCache = new Map<string, { cachedAt: number; value: PlaceLookupResult }>()
const geocodeCache = new Map<string, { cachedAt: number; value: { latitude: number; longitude: number } | null }>()
let lastLookupRequestAt = 0

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
  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    throw new Error(NAVER_URL_ERROR_MESSAGE)
  }
  if (parsedUrl.hostname !== 'naver.me') {
    return rawUrl
  }

  const tryResolveRedirect = async (method: 'GET' | 'HEAD') => {
    const response = await fetch(rawUrl, {
      method,
      redirect: 'manual',
    })
    return response.headers.get('location')
  }

  const redirectedUrl = await tryResolveRedirect('HEAD') ?? await tryResolveRedirect('GET')

  if (!redirectedUrl) {
    throw new Error(REDIRECT_FAILED_MESSAGE)
  }

  return new URL(redirectedUrl, rawUrl).toString()
}

const delay = async (milliseconds: number) => {
  if (milliseconds <= 0) {
    return
  }

  await new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const waitForLookupWindow = async () => {
  if (process.env.NODE_ENV === 'test') {
    lastLookupRequestAt = Date.now()
    return
  }

  const now = Date.now()
  const remainingDelay = PLACE_LOOKUP_REQUEST_DELAY_MS - (now - lastLookupRequestAt)
  if (remainingDelay > 0) {
    await delay(remainingDelay)
  }
  lastLookupRequestAt = Date.now()
}

type NaverPlaceSummaryPayload = {
  data?: {
    placeDetail?: {
      id?: string
      name?: string
      coordinate?: {
        latitude?: number | null
        longitude?: number | null
      } | null
      address?: {
        address?: string | null
        roadAddress?: string | null
      } | null
    } | null
  } | null
}

const fetchPlaceSummaryRecord = async ({
  canonicalUrl,
  placeId,
}: {
  canonicalUrl: string
  placeId: string
}): Promise<PlaceLookupSourceRecord | null> => {
  await waitForLookupWindow()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PLACE_LOOKUP_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`https://map.naver.com/p/api/place/summary/${placeId}`, {
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        Referer: canonicalUrl,
        'User-Agent': 'Mozilla/5.0',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as NaverPlaceSummaryPayload
    const placeDetail = payload.data?.placeDetail
    const name = placeDetail?.name?.trim()
    const roadAddress = placeDetail?.address?.roadAddress?.trim() ?? null
    const landLotAddress = placeDetail?.address?.address?.trim() ?? null

    if (!name || (!roadAddress && !landLotAddress)) {
      return null
    }

    const latitude = placeDetail?.coordinate?.latitude
    const longitude = placeDetail?.coordinate?.longitude

    return {
      naver_place_id: placeDetail?.id ?? placeId,
      canonical_url: canonicalUrl,
      name,
      road_address: roadAddress,
      land_lot_address: landLotAddress,
      latitude: typeof latitude === 'number' && Number.isFinite(latitude) ? latitude : null,
      longitude: typeof longitude === 'number' && Number.isFinite(longitude) ? longitude : null,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
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
  let resolvedUrl: string
  try {
    resolvedUrl = await resolveLookupUrl(rawUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : REDIRECT_FAILED_MESSAGE
    const result: PlaceLookupError = {
      status: 'error',
      error: {
        code: message === NAVER_URL_ERROR_MESSAGE ? 'invalid_url' : 'redirect_failed',
        message,
      },
    }
    return result
  }

  let normalized
  try {
    normalized = normalizeNaverMapUrl(resolvedUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : NAVER_URL_ERROR_MESSAGE
    const result: PlaceLookupError = {
      status: 'error',
      error: {
        code: message === NAVER_URL_ERROR_MESSAGE ? 'invalid_url' : 'place_id_extraction_failed',
        message,
      },
    }
    return result
  }

  const cachedResult = readCachedValue(lookupResultCache, normalized.canonicalUrl)
  if (cachedResult) {
    return cachedResult
  }

  const sourceRecord =
    process.env.NODE_ENV === 'test' && process.env.NAVER_PLACE_LOOKUP_ALLOW_NETWORK_IN_TEST !== 'true'
      ? PLACE_LOOKUP_FIXTURES[normalized.naverPlaceId] ?? null
      : await fetchPlaceSummaryRecord({
        canonicalUrl: normalized.canonicalUrl,
        placeId: normalized.naverPlaceId,
      })

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

  const result: PlaceLookupSuccess = {
    status: 'success',
    data: {
      naver_place_id: sourceRecord.naver_place_id,
      canonical_url: sourceRecord.canonical_url,
      name: sourceRecord.name,
      road_address: sourceRecord.road_address,
      land_lot_address: sourceRecord.land_lot_address,
      representative_address: sourceRecord.road_address ?? sourceRecord.land_lot_address,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      coordinate_source: coordinates?.coordinate_source ?? 'unavailable',
    },
  }
  writeCachedValue(lookupResultCache, normalized.canonicalUrl, result)
  return result
}

export const __resetPlaceLookupCaches = () => {
  lookupResultCache.clear()
  geocodeCache.clear()
  lastLookupRequestAt = 0
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
