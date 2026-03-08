import { normalizeNaverMapUrl } from '../app-shell/naverUrl'
import { GEOCODE_FIXTURES, PLACE_LOOKUP_FIXTURES } from './fixtures/placeLookupFixtures'
import type { PlaceLookupResult, PlaceLookupSourceRecord } from './placeLookupTypes'

const LOOKUP_FAILED_MESSAGE = '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.'
const COORDINATES_FAILED_MESSAGE = '좌표를 확인하지 못했어요. 다시 시도해 주세요.'

const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
  if (GEOCODE_FIXTURES[address]) {
    return GEOCODE_FIXTURES[address]
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY
  if (!restApiKey) {
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
    return null
  }

  const data = (await response.json()) as {
    documents?: Array<{ x: string; y: string }>
  }
  const firstDocument = data.documents?.[0]

  if (!firstDocument) {
    return null
  }

  return {
    latitude: Number(firstDocument.y),
    longitude: Number(firstDocument.x),
  }
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
  const sourceRecord = PLACE_LOOKUP_FIXTURES[normalized.naverPlaceId]

  if (!sourceRecord) {
    return {
      status: 'error',
      error: {
        code: 'lookup_failed',
        message: LOOKUP_FAILED_MESSAGE,
      },
    }
  }

  const coordinates = await resolveCoordinates(sourceRecord)

  if (!coordinates) {
    return {
      status: 'error',
      error: {
        code: 'coordinates_unavailable',
        message: COORDINATES_FAILED_MESSAGE,
      },
    }
  }

  return {
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
}
