import { MOCK_PLACES } from './mockPlaces'
import type { PlaceSummary, ReviewSummary, ZeropayStatus } from './types'
import type { PlaceLookupSuccess } from '../shared/placeLookupTypes.js'

export const CURRENT_USER_NAME = '테스트 사용자'
const REVIEW_LIMIT = 500
const REVIEW_SAVE_FAILED_MESSAGE = '리뷰를 저장하지 못했어요. 다시 시도해 주세요.'
const DUPLICATE_PLACE_CONFIRM_MESSAGE = '이미 등록된 장소예요. 지금 입력한 정보를 이 장소에 반영할까요?'
const OVERWRITE_REVIEW_CONFIRM_MESSAGE = '이미 내가 리뷰를 남긴 장소예요. 지금 입력한 정보를 반영할까요?'

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

export type PlaceRegistrationLookupData = Pick<
  PlaceLookupSuccess['data'],
  'naver_place_id' | 'canonical_url' | 'name' | 'road_address' | 'land_lot_address' | 'representative_address' | 'latitude' | 'longitude'
>

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
      status: 'updated'
      place: PlaceSummary
      places: PlaceSummary[]
      message: '기존 장소에 정보를 반영했어요.'
    }
  | {
      status: 'existing_review'
      place: PlaceSummary
      places: PlaceSummary[]
      message: '이미 리뷰를 남긴 장소예요'
    }

export type PlaceRegistrationPreparationResult =
  | {
      status: 'ready'
    }
  | {
      status: 'confirm_required'
      reason: 'merge_place' | 'overwrite_review'
      place: PlaceSummary
      confirmMessage: typeof DUPLICATE_PLACE_CONFIRM_MESSAGE | typeof OVERWRITE_REVIEW_CONFIRM_MESSAGE
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
      message: string
    }

type PlaceListResponse =
  | { status: 'success'; places: PlaceSummary[] }
  | { error?: { message?: string } }

type PlaceDetailResponse =
  | { status: 'success'; place: PlaceSummary }
  | { error?: { message?: string } }

type PlaceReviewResponse =
  | { status: 'saved'; place: PlaceSummary }
  | { status: 'existing_review'; place: PlaceSummary; message: '이미 리뷰를 남긴 장소예요' }
  | { error?: { message?: string } }

const roundAverage = (value: number) => Math.round(value * 10) / 10

const normalizeDuplicateValue = (value: string | null | undefined) =>
  (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

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

const computeAverageRatingForOverwrite = ({
  currentAverage,
  currentCount,
  previousRating,
  nextRating,
}: {
  currentAverage: number
  currentCount: number
  previousRating: number
  nextRating: number
}) => {
  if (currentCount <= 0) {
    return nextRating
  }

  return roundAverage((currentAverage * currentCount - previousRating + nextRating) / currentCount)
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

const resolveRoadAddress = (lookupData: PlaceRegistrationLookupData) =>
  lookupData.road_address ?? lookupData.representative_address ?? lookupData.land_lot_address ?? ''

const buildDuplicateCandidateKey = ({
  name,
  roadAddress,
  landLotAddress,
}: {
  name: string
  roadAddress?: string | null
  landLotAddress?: string | null
}) => {
  const address = roadAddress ?? landLotAddress ?? ''
  return `${normalizeDuplicateValue(name)}::${normalizeDuplicateValue(address)}`
}

const findMatchingPlace = ({
  lookupData,
  places,
}: {
  lookupData: PlaceRegistrationLookupData
  places: PlaceSummary[]
}) => {
  const matchedByNaverId = places.find((place) => place.naver_place_id === lookupData.naver_place_id)
  if (matchedByNaverId) {
    return matchedByNaverId
  }

  const duplicateKey = buildDuplicateCandidateKey({
    name: lookupData.name,
    roadAddress: lookupData.road_address ?? lookupData.representative_address,
    landLotAddress: lookupData.land_lot_address,
  })

  return places.find((place) =>
    buildDuplicateCandidateKey({
      name: place.name,
      roadAddress: place.road_address,
    }) === duplicateKey)
}

const buildCreatedPlace = ({
  draft,
  lookupData,
}: {
  draft: RegistrationDraft
  lookupData: PlaceRegistrationLookupData
}): PlaceSummary => {
  const review = createReview(draft, `new-${lookupData.naver_place_id}`)

  return {
    id: `place-${lookupData.naver_place_id}`,
    naver_place_id: lookupData.naver_place_id,
    naver_place_url: lookupData.canonical_url,
    name: lookupData.name,
    road_address: resolveRoadAddress(lookupData),
    latitude: lookupData.latitude,
    longitude: lookupData.longitude,
    place_type: draft.place_type,
    zeropay_status: draft.zeropay_status,
    average_rating: draft.rating_score,
    review_count: 1,
    added_by_name: CURRENT_USER_NAME,
    my_review: review,
    reviews: [review],
  }
}

const buildMergedPlace = ({
  draft,
  existingPlace,
  lookupData,
}: {
  draft: RegistrationDraft
  existingPlace: PlaceSummary
  lookupData: PlaceRegistrationLookupData
}) => {
  const review = createReview(draft, `merge-${lookupData.naver_place_id}`)
  const mergedReviews = [review, ...existingPlace.reviews]

  return {
    ...existingPlace,
    naver_place_url: lookupData.canonical_url,
    name: lookupData.name,
    road_address: resolveRoadAddress(lookupData) || existingPlace.road_address,
    latitude: lookupData.latitude ?? existingPlace.latitude,
    longitude: lookupData.longitude ?? existingPlace.longitude,
    place_type: draft.place_type,
    zeropay_status: mergeZeropayStatus(existingPlace.zeropay_status, draft.zeropay_status),
    average_rating: computeAverageRatingFromAggregate({
      currentAverage: existingPlace.average_rating,
      currentCount: existingPlace.review_count,
      nextRating: draft.rating_score,
    }),
    review_count: existingPlace.review_count + 1,
    my_review: review,
    reviews: mergedReviews,
  }
}

const buildUpdatedReview = ({
  currentReview,
  draft,
}: {
  currentReview: ReviewSummary
  draft: RegistrationDraft
}) => ({
  ...currentReview,
  content: draft.review_content.trim() === '' ? currentReview.content : draft.review_content,
  rating_score: draft.rating_score,
})

const updateReviewsForOverwrite = ({
  currentReview,
  nextReview,
  reviews,
}: {
  currentReview: ReviewSummary
  nextReview: ReviewSummary
  reviews: ReviewSummary[]
}) => {
  const reviewIndex = reviews.findIndex((review) => review.id === currentReview.id)
  if (reviewIndex >= 0) {
    return reviews.map((review, index) => (index === reviewIndex ? nextReview : review))
  }

  const fallbackIndex = reviews.findIndex((review) =>
    review.content === currentReview.content
    && review.created_at === currentReview.created_at
    && review.rating_score === currentReview.rating_score)

  if (fallbackIndex < 0) {
    return reviews
  }

  return reviews.map((review, index) =>
    index === fallbackIndex
      ? {
          ...review,
          content: nextReview.content,
          rating_score: nextReview.rating_score,
        }
      : review)
}

const buildUpdatedPlace = ({
  draft,
  existingPlace,
  lookupData,
}: {
  draft: RegistrationDraft
  existingPlace: PlaceSummary
  lookupData: PlaceRegistrationLookupData
}) => {
  if (!existingPlace.my_review) {
    return buildMergedPlace({
      draft,
      existingPlace,
      lookupData,
    })
  }

  const nextMyReview = buildUpdatedReview({
    currentReview: existingPlace.my_review,
    draft,
  })

  return {
    ...existingPlace,
    naver_place_url: lookupData.canonical_url,
    name: lookupData.name,
    road_address: resolveRoadAddress(lookupData) || existingPlace.road_address,
    latitude: lookupData.latitude ?? existingPlace.latitude,
    longitude: lookupData.longitude ?? existingPlace.longitude,
    place_type: draft.place_type,
    zeropay_status: mergeZeropayStatus(existingPlace.zeropay_status, draft.zeropay_status),
    average_rating: computeAverageRatingForOverwrite({
      currentAverage: existingPlace.average_rating,
      currentCount: existingPlace.review_count,
      previousRating: existingPlace.my_review.rating_score,
      nextRating: draft.rating_score,
    }),
    review_count: existingPlace.review_count,
    my_review: nextMyReview,
    reviews: updateReviewsForOverwrite({
      currentReview: existingPlace.my_review,
      nextReview: nextMyReview,
      reviews: existingPlace.reviews,
    }),
  }
}

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
  import.meta.env.MODE === 'test'
    ? MOCK_PLACES.map(clonePlace)
    : [] as PlaceSummary[]

const clonePlace = (place: PlaceSummary): PlaceSummary => ({
  ...place,
  my_review: place.my_review ? { ...place.my_review } : null,
  reviews: place.reviews.map((review) => ({ ...review })),
})

const parseJson = async <T>(response: Response) => response.json() as Promise<T>

export const loadPlaceList = async () => {
  const response = await fetch('/api/places')
  const payload = await parseJson<PlaceListResponse>(response)

  if (!response.ok || !('status' in payload) || payload.status !== 'success') {
    throw new Error(getErrorMessage(payload as ErrorResponse, '장소 목록을 불러오지 못했어요.'))
  }

  return payload.places.map(clonePlace)
}

export const loadPlaceDetail = async (placeId: string) => {
  const response = await fetch(`/api/places/${encodeURIComponent(placeId)}`)
  const payload = await parseJson<PlaceDetailResponse>(response)

  if (!response.ok || !('status' in payload) || payload.status !== 'success') {
    throw new Error(getErrorMessage(payload as ErrorResponse, '장소 상세를 불러오지 못했어요.'))
  }

  return clonePlace(payload.place)
}

export const preparePlaceRegistration = ({
  lookupData,
  places,
}: {
  lookupData: PlaceRegistrationLookupData
  places: PlaceSummary[]
}): PlaceRegistrationPreparationResult => {
  const existingPlace = findMatchingPlace({
    lookupData,
    places,
  })

  if (!existingPlace) {
    return { status: 'ready' }
  }

  return {
    status: 'confirm_required',
    reason: existingPlace.my_review ? 'overwrite_review' : 'merge_place',
    place: existingPlace,
    confirmMessage: existingPlace.my_review
      ? OVERWRITE_REVIEW_CONFIRM_MESSAGE
      : DUPLICATE_PLACE_CONFIRM_MESSAGE,
  }
}

export const confirmPlaceRegistration = ({
  draft,
  lookupData,
  places,
}: {
  draft: RegistrationDraft
  lookupData: PlaceRegistrationLookupData
  places: PlaceSummary[]
}): PlaceRegistrationResult => {
  const preparation = preparePlaceRegistration({
    lookupData,
    places,
  })

  if (preparation.status === 'ready') {
    const newPlace = buildCreatedPlace({
      draft,
      lookupData,
    })

    return {
      status: 'created',
      place: newPlace,
      places: [newPlace, ...places],
      message: '장소를 추가했어요.',
    }
  }

  if (preparation.reason === 'overwrite_review') {
    const nextPlace = buildUpdatedPlace({
      draft,
      existingPlace: preparation.place,
      lookupData,
    })

    return {
      status: 'updated',
      place: nextPlace,
      places: places.map((place) => (place.id === preparation.place.id ? nextPlace : place)),
      message: '기존 장소에 정보를 반영했어요.',
    }
  }

  const nextPlace = buildMergedPlace({
    draft,
    existingPlace: preparation.place,
    lookupData,
  })

  return {
    status: 'merged',
    place: nextPlace,
    places: places.map((place) => (place.id === preparation.place.id ? nextPlace : place)),
    message: '기존 장소에 정보를 합쳤어요.',
  }
}

export const registerOrMergePlace = ({
  draft,
  lookupData,
  places,
}: {
  draft: RegistrationDraft
  lookupData: PlaceRegistrationLookupData
  places: PlaceSummary[]
}): PlaceRegistrationResult => {
  const preparation = preparePlaceRegistration({
    lookupData,
    places,
  })

  if (preparation.status === 'ready') {
    return confirmPlaceRegistration({
      draft,
      lookupData,
      places,
    })
  }

  if (preparation.reason === 'overwrite_review') {
    return {
      status: 'existing_review',
      place: preparation.place,
      places,
      message: '이미 리뷰를 남긴 장소예요',
    }
  }

  return confirmPlaceRegistration({
    draft,
    lookupData,
    places,
  })
}

export const submitReviewForPlace = async ({
  csrfHeaderName,
  csrfToken,
  draft,
  placeId,
  places,
}: {
  csrfHeaderName: string | null
  csrfToken: string | null
  draft: ReviewDraft
  placeId: string
  places: PlaceSummary[]
}): Promise<ReviewSubmissionResult> => {
  const targetPlace = places.find((place) => place.id === placeId) ?? null

  if (!csrfHeaderName || !csrfToken) {
    return {
      status: 'error',
      place: targetPlace,
      places,
      message: REVIEW_SAVE_FAILED_MESSAGE,
    }
  }

  const response = await fetch(`/api/places/${encodeURIComponent(placeId)}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [csrfHeaderName]: csrfToken,
    },
    body: JSON.stringify({
      placeId,
      ratingScore: draft.rating_score,
      reviewContent: draft.review_content,
    }),
  })
  const payload = await parseJson<PlaceReviewResponse>(response)

  if (!response.ok) {
    return {
      status: 'error',
      place: targetPlace,
      places,
      message: getErrorMessage(payload as ErrorResponse, REVIEW_SAVE_FAILED_MESSAGE),
    }
  }

  if ('status' in payload && payload.status === 'existing_review') {
    const nextPlace = clonePlace(payload.place)
    return {
      status: 'existing_review',
      place: nextPlace,
      places: places.map((place) => (place.id === nextPlace.id ? nextPlace : place)),
      message: payload.message,
    }
  }

  if ('status' in payload && payload.status === 'saved') {
    const nextPlace = clonePlace(payload.place)
    return {
      status: 'saved',
      place: nextPlace,
      places: places.map((place) => (place.id === nextPlace.id ? nextPlace : place)),
    }
  }

  return {
    status: 'error',
    place: targetPlace,
    places,
    message: REVIEW_SAVE_FAILED_MESSAGE,
  }
}
type ErrorResponse = {
  error?: {
    message?: string
  }
}

const getErrorMessage = (payload: unknown, fallbackMessage: string) =>
  typeof payload === 'object'
  && payload !== null
  && 'error' in payload
  && typeof payload.error === 'object'
  && payload.error !== null
  && 'message' in payload.error
  && typeof payload.error.message === 'string'
    ? payload.error.message
    : fallbackMessage
