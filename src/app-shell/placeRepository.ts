import { MOCK_PLACES } from './mockPlaces'
import type { PlaceSummary, ReviewSummary, ZeropayStatus } from './types'
import type { PlaceLookupSuccess } from '../server/placeLookupTypes'

export const CURRENT_USER_NAME = '테스트 사용자'
const REVIEW_LIMIT = 500
const REVIEW_SAVE_FAILED_MESSAGE = '리뷰를 저장하지 못했어요. 다시 시도해 주세요.'

export type RegistrationDraft = {
  place_type: 'restaurant' | 'cafe'
  zeropay_status: ZeropayStatus
  rating_score: number
  review_content: string
}

export type ReviewDraft = {
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

export type ReviewSubmissionResult =
  | {
      status: 'saved'
      place: PlaceSummary
      places: PlaceSummary[]
    }
  | {
      status: 'existing_review'
      place: PlaceSummary
      places: PlaceSummary[]
      message: '이미 리뷰를 남긴 장소예요'
    }
  | {
      status: 'error'
      place: PlaceSummary | null
      places: PlaceSummary[]
      message: typeof REVIEW_SAVE_FAILED_MESSAGE
    }

export type RecommendationToggleResult =
  | {
      status: 'toggled'
      place: PlaceSummary
      places: PlaceSummary[]
    }
  | {
      status: 'error'
      place: PlaceSummary | null
      places: PlaceSummary[]
      message: string
    }

const roundAverage = (value: number) => Math.round(value * 10) / 10

const computeAverageRatingFromAggregate = ({
  currentAverage,
  currentCount,
  nextRating,
}: {
  currentAverage: number
  currentCount: number
  nextRating: number
}) => {
  if (currentCount <= 0) {
    return nextRating
  }

  return roundAverage((currentAverage * currentCount + nextRating) / (currentCount + 1))
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

const createReviewFromDraft = (draft: ReviewDraft, idSeed: string): ReviewSummary => ({
  id: `review-${idSeed}`,
  author_name: CURRENT_USER_NAME,
  content: draft.review_content,
  created_at: '2026-03-08',
  rating_score: draft.rating_score,
})

export const createInitialReviewDraft = (): ReviewDraft => ({
  rating_score: 5,
  review_content: '',
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

  if (draft.review_content.length > REVIEW_LIMIT) {
    return '리뷰는 500자 이하로 입력해주세요.'
  }

  if (lookupData.latitude === undefined || lookupData.longitude === undefined) {
    return '좌표를 확인한 뒤에만 등록할 수 있어요.'
  }

  return null
}

export const validateReviewDraft = (draft: ReviewDraft) => {
  if (draft.rating_score < 1 || draft.rating_score > 5) {
    return '별점은 1점에서 5점 사이여야 해요.'
  }

  if (draft.review_content.length > REVIEW_LIMIT) {
    return '리뷰는 500자 이하로 입력해주세요.'
  }

  return null
}

export const createInitialPlaces = () =>
  MOCK_PLACES.map((place) => ({
    ...place,
    my_review: place.my_review ? { ...place.my_review } : null,
    reviews: place.reviews.map((review) => ({ ...review })),
  }))

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
      my_recommendation_active: false,
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
    average_rating: computeAverageRatingFromAggregate({
      currentAverage: existingPlace.average_rating,
      currentCount: existingPlace.review_count,
      nextRating: draft.rating_score,
    }),
    review_count: existingPlace.review_count + 1,
    my_recommendation_active: existingPlace.my_recommendation_active,
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

export const submitReviewForPlace = ({
  draft,
  placeId,
  places,
}: {
  draft: ReviewDraft
  placeId: string
  places: PlaceSummary[]
}): ReviewSubmissionResult => {
  const targetPlace = places.find((place) => place.id === placeId) ?? null

  if (!targetPlace) {
    return {
      status: 'error',
      place: null,
      places,
      message: REVIEW_SAVE_FAILED_MESSAGE,
    }
  }

  if (targetPlace.my_review) {
    return {
      status: 'existing_review',
      place: targetPlace,
      places,
      message: '이미 리뷰를 남긴 장소예요',
    }
  }

  if (targetPlace.name === '리뷰 저장 실패 장소') {
    return {
      status: 'error',
      place: targetPlace,
      places,
      message: REVIEW_SAVE_FAILED_MESSAGE,
    }
  }

  const review = createReviewFromDraft(draft, `${targetPlace.id}-${targetPlace.review_count + 1}`)
  const nextPlace: PlaceSummary = {
    ...targetPlace,
    average_rating: computeAverageRatingFromAggregate({
      currentAverage: targetPlace.average_rating,
      currentCount: targetPlace.review_count,
      nextRating: draft.rating_score,
    }),
    review_count: targetPlace.review_count + 1,
    my_review: review,
    reviews: [review, ...targetPlace.reviews],
  }

  return {
    status: 'saved',
    place: nextPlace,
    places: places.map((place) => (place.id === targetPlace.id ? nextPlace : place)),
  }
}

export const toggleRecommendationForPlace = ({
  placeId,
  places,
}: {
  placeId: string
  places: PlaceSummary[]
}): RecommendationToggleResult => {
  const targetPlace = places.find((place) => place.id === placeId) ?? null

  if (!targetPlace) {
    return {
      status: 'error',
      place: null,
      places,
      message: '추천 상태를 변경하지 못했어요. 다시 시도해 주세요.',
    }
  }

  const nextRecommendationActive = !targetPlace.my_recommendation_active
  const nextRecommendationCount = nextRecommendationActive
    ? targetPlace.recommendation_count + 1
    : Math.max(0, targetPlace.recommendation_count - 1)

  const nextPlace: PlaceSummary = {
    ...targetPlace,
    recommendation_count: nextRecommendationCount,
    my_recommendation_active: nextRecommendationActive,
  }

  return {
    status: 'toggled',
    place: nextPlace,
    places: places.map((place) => (place.id === targetPlace.id ? nextPlace : place)),
  }
}
