import { GEOCODE_FIXTURES } from './_placeLookupFixtures.js'
import type { PlaceLookupResult, PlaceLookupSuccess } from './_placeLookupTypes.js'

const COORDINATES_FAILED_MESSAGE = '주소를 찾지 못했어요. 입력한 주소를 다시 확인해 주세요.'
const INVALID_ENTRY_MESSAGE = '장소명과 주소를 다시 확인해 주세요.'
const geocodeCache = new Map<string, { latitude: number; longitude: number } | null>()

const normalizeValue = (value: string) => value.trim().normalize('NFKC').toLowerCase().replace(/\s+/g, ' ')

const createSyntheticPlaceId = ({
  name,
  roadAddress,
}: {
  name: string
  roadAddress: string
}) => {
  const source = `${normalizeValue(name)}::${normalizeValue(roadAddress)}`
  let hash = 0

  for (const character of source) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return `direct-entry-${hash.toString(36)}`
}

const createSearchUrl = ({
  name,
  roadAddress,
}: {
  name: string
  roadAddress: string
}) => `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${roadAddress}`)}`

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

const resolveCoordinates = async ({
  landLotAddress,
  roadAddress,
}: {
  landLotAddress: string | null
  roadAddress: string
}) => {
  const roadResult = await geocodeAddress(roadAddress)
  if (roadResult) {
    return {
      ...roadResult,
      coordinate_source: 'road_address_geocode' as const,
    }
  }

  if (!landLotAddress) {
    return null
  }

  const landLotResult = await geocodeAddress(landLotAddress)
  if (!landLotResult) {
    return null
  }

  return {
    ...landLotResult,
    coordinate_source: 'land_lot_address_geocode' as const,
  }
}

export const preparePlaceEntryFromDraft = async ({
  landLotAddress = null,
  name,
  roadAddress,
}: {
  landLotAddress?: string | null
  name: string
  roadAddress: string
}): Promise<PlaceLookupResult> => {
  const trimmedName = name.trim()
  const trimmedRoadAddress = roadAddress.trim()
  const trimmedLandLotAddress = landLotAddress?.trim() ? landLotAddress.trim() : null

  if (!trimmedName || !trimmedRoadAddress) {
    return {
      status: 'error',
      error: {
        code: 'lookup_failed',
        message: INVALID_ENTRY_MESSAGE,
      },
    }
  }

  const coordinates = await resolveCoordinates({
    roadAddress: trimmedRoadAddress,
    landLotAddress: trimmedLandLotAddress,
  })

  if (!coordinates) {
    return {
      status: 'error',
      error: {
        code: 'coordinates_unavailable',
        message: COORDINATES_FAILED_MESSAGE,
      },
    }
  }

  const result: PlaceLookupSuccess = {
    status: 'success',
    data: {
      naver_place_id: createSyntheticPlaceId({
        name: trimmedName,
        roadAddress: trimmedRoadAddress,
      }),
      canonical_url: createSearchUrl({
        name: trimmedName,
        roadAddress: trimmedRoadAddress,
      }),
      name: trimmedName,
      road_address: trimmedRoadAddress,
      land_lot_address: trimmedLandLotAddress,
      representative_address: trimmedRoadAddress,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      coordinate_source: coordinates.coordinate_source,
    },
  }

  return result
}

export const __resetPlaceEntryCaches = () => {
  geocodeCache.clear()
}
