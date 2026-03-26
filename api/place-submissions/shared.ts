import type { PlaceLookupResult, PlaceLookupSuccess } from '../../src/shared/placeLookupTypes.js'
import {
  type PersistedPlaceRegistrationDraft,
} from '../../src/server-core/place/placeDataService.js'
import { preparePlaceEntryFromDraft } from '../../src/server-core/place/placeEntryService.js'

export const GENERIC_PLACE_SUBMISSION_ERROR_MESSAGE = '등록하지 못했어요. 잠시 후 다시 시도해 주세요.'
export const PLACE_SUBMISSION_RATE_LIMIT_MESSAGE = '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
export const PLACE_SUBMISSION_RATE_LIMIT = {
  limit: 6,
  windowMs: 60_000,
} as const

const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const isLookupDataCandidate = (value: unknown): value is PlaceLookupSuccess['data'] =>
  typeof value === 'object'
  && value !== null
  && isString((value as PlaceLookupSuccess['data']).naver_place_id)
  && isString((value as PlaceLookupSuccess['data']).canonical_url)
  && isString((value as PlaceLookupSuccess['data']).name)
  && ((value as PlaceLookupSuccess['data']).road_address === null
    || isString((value as PlaceLookupSuccess['data']).road_address))
  && ((value as PlaceLookupSuccess['data']).land_lot_address === null
    || isString((value as PlaceLookupSuccess['data']).land_lot_address))
  && ((value as PlaceLookupSuccess['data']).representative_address === null
    || isString((value as PlaceLookupSuccess['data']).representative_address))
  && isNumber((value as PlaceLookupSuccess['data']).latitude)
  && isNumber((value as PlaceLookupSuccess['data']).longitude)
  && (
    (value as PlaceLookupSuccess['data']).coordinate_source === 'naver'
    || (value as PlaceLookupSuccess['data']).coordinate_source === 'road_address_geocode'
    || (value as PlaceLookupSuccess['data']).coordinate_source === 'land_lot_address_geocode'
  )

export const getPlaceRegistrationDraftFromBody = (body: unknown): PersistedPlaceRegistrationDraft => {
  const record = (body ?? {}) as Record<string, unknown>

  return {
    place_type: record.placeType === 'restaurant' || record.placeType === 'cafe'
      ? record.placeType
      : 'restaurant',
    zeropay_status:
      record.zeropayStatus === 'available'
      || record.zeropayStatus === 'unavailable'
      || record.zeropayStatus === 'needs_verification'
        ? record.zeropayStatus
        : 'available',
    rating_score: typeof record.ratingScore === 'number' ? record.ratingScore : 0,
    review_content: typeof record.reviewContent === 'string' ? record.reviewContent : '',
  }
}

export const resolvePlaceLookupDataFromBody = async (body: unknown): Promise<PlaceLookupResult> => {
  const record = (body ?? {}) as Record<string, unknown>
  if (isLookupDataCandidate(record.lookupData)) {
    return {
      status: 'success',
      data: record.lookupData,
    }
  }

  return preparePlaceEntryFromDraft({
    name: typeof record.name === 'string' ? record.name : '',
    roadAddress: typeof record.roadAddress === 'string' ? record.roadAddress : '',
    landLotAddress: typeof record.landLotAddress === 'string' ? record.landLotAddress : null,
  })
}
