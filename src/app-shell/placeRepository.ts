import { MOCK_PLACES } from './mockPlaces'
import type { PlaceSummary, ReviewSummary, ZeropayStatus } from './types'
import type { PlaceLookupSuccess } from '../server/placeLookupTypes'

export const CURRENT_USER_NAME = '테스트 사용자'

export type RegistrationDraft = {
  place_type: 'restaurant' | 'cafe'
  zeropay_status: ZeropayStatus
  rating_score: number
  review_content: string
}

export type PlaceRegistrationResult =
  | {
      status: 'created'
      place: PlaceSummary
      places: PlaceSummary[]
      message: '장소를 추가했어요.'
    }
  | {
      status: 'merged'
      place: PlaceSummary
      places: PlaceSummary[]
      message: '기존 장소에 정보를 합쳤어요.'
    }
  | {
      status: 'existing_review'
      place: PlaceSummary
      places: PlaceSummary[]
      message: '이미 리뷰를 남긴 장소예요'
    }

const roundAverage = (value: number) => Math.round(value * 10) / 10

const computeAverageRating = (reviews: ReviewSummary[]) => {
  if (reviews.length === 0) {
    return 0
  }

  const total = reviews.reduce((sum, review) => sum + review.rating_score, 0)
  return roundAverage(total / reviews.length)
}

const mergeZeropayStatus = (currentStatus: ZeropayStatus, nextStatus: ZeropayStatus): ZeropayStatus => {
  const isCurrentConfirmed = currentStatus !== 'needs_verification'
  const isNextConfirmed = nextStatus !== 'needs_verification'

  if (!isCurrentConfirmed && isNextConfirmed) {
    return nextStatus
  }

  if (isCurrentConfirmed && !isNextConfirmed) {
    return currentStatus
  }

  return nextStatus
}

const createReview = (draft: RegistrationDraft, idSeed: string): ReviewSummary => ({
  id: `review-${idSeed}`,
  author_name: CURRENT_USER_NAME,
  content: draft.review_content,
  created_at: '2026-03-08',
  rating_score: draft.rating_score,
})


export const validateRegistrationDraft = ({
  draft,
  lookupData,
}: {
  draft: RegistrationDraft
  lookupData: { latitude?: number; longitude?: number }
}) => {
  if (!['restaurant', 'cafe'].includes(draft.place_type)) {
    return '유효한 place_type을 선택해주세요.'
  }

  if (!['available', 'unavailable', 'needs_verification'].includes(draft.zeropay_status)) {
    return '유효한 zeropay_status를 선택해주세요.'
  }

  if (draft.rating_score < 1 || draft.rating_score > 5) {
    return '별점은 1점에서 5점 사이여야 해요.'
  }

  if (draft.review_content.length > 500) {
    return '리뷰는 500자 이하로 입력해주세요.'
  }

  if (lookupData.latitude === undefined || lookupData.longitude === undefined) {
    return '좌표를 확인한 뒤에만 등록할 수 있어요.'
  }

  return null
}

export const createInitialPlaces = () => [...MOCK_PLACES]

export const registerOrMergePlace = ({
  draft,
  lookupData,
  places,
}: {
  draft: RegistrationDraft
  lookupData: PlaceLookupSuccess['data']
  places: PlaceSummary[]
}): PlaceRegistrationResult => {
  const existingPlace = places.find((place) => place.naver_place_id === lookupData.naver_place_id)

  if (!existingPlace) {
    const review = createReview(draft, `new-${lookupData.naver_place_id}`)
    const newPlace: PlaceSummary = {
      id: `place-${lookupData.naver_place_id}`,
      naver_place_id: lookupData.naver_place_id,
      naver_place_url: lookupData.canonical_url,
      name: lookupData.name,
      road_address: lookupData.road_address ?? lookupData.representative_address ?? '',
      latitude: lookupData.latitude,
      longitude: lookupData.longitude,
      place_type: draft.place_type,
      zeropay_status: draft.zeropay_status,
      average_rating: draft.rating_score,
      review_count: 1,
      created_by_name: CURRENT_USER_NAME,
      recommendation_count: 0,
      my_review: review,
      reviews: [review],
    }

    return {
      status: 'created',
      place: newPlace,
      places: [newPlace, ...places],
      message: '장소를 추가했어요.',
    }
  }

  if (existingPlace.my_review) {
    return {
      status: 'existing_review',
      place: existingPlace,
      places,
      message: '이미 리뷰를 남긴 장소예요',
    }
  }

  const review = createReview(draft, `merge-${lookupData.naver_place_id}`)
  const mergedReviews = [review, ...existingPlace.reviews]
  const mergedPlace: PlaceSummary = {
    ...existingPlace,
    naver_place_url: lookupData.canonical_url,
    name: lookupData.name,
    road_address: lookupData.road_address ?? existingPlace.road_address,
    latitude: lookupData.latitude,
    longitude: lookupData.longitude,
    place_type: draft.place_type,
    zeropay_status: mergeZeropayStatus(existingPlace.zeropay_status, draft.zeropay_status),
    average_rating: computeAverageRating(mergedReviews),
    review_count: mergedReviews.length,
    my_review: review,
    reviews: mergedReviews,
  }

  return {
    status: 'merged',
    place: mergedPlace,
    places: places.map((place) => (place.id === existingPlace.id ? mergedPlace : place)),
    message: '기존 장소에 정보를 합쳤어요.',
  }
}
