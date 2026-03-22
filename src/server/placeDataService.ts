import type { PoolClient } from 'pg'

import type { PlaceSummary, ReviewSummary } from '../app-shell/types'
import type { PlaceLookupSuccess } from './placeLookupTypes'
import { withDatabaseConnection, withDatabaseTransaction } from './database.js'

const DUPLICATE_PLACE_CONFIRM_MESSAGE = '이미 등록된 장소예요. 지금 입력한 정보를 이 장소에 반영할까요?'
const OVERWRITE_REVIEW_CONFIRM_MESSAGE = '이미 내가 리뷰를 남긴 장소예요. 지금 입력한 정보를 반영할까요?'
const REVIEW_LIMIT = 500
const REVIEW_SAVE_FAILED_MESSAGE = '리뷰를 저장하지 못했어요. 다시 시도해 주세요.'
const PLACE_SAVE_FAILED_MESSAGE = '등록하지 못했어요. 잠시 후 다시 시도해 주세요.'

type PlaceType = 'restaurant' | 'cafe'
type ZeropayStatus = 'available' | 'unavailable' | 'needs_verification'

type PlaceRow = {
  id: string
  naver_place_id: string
  naver_place_url: string
  name: string
  road_address: string
  latitude: number | null
  longitude: number | null
  place_type: 'restaurant' | 'cafe'
  zeropay_status: 'available' | 'unavailable' | 'needs_verification'
  average_rating: number
  review_count: number
  added_by_name: string
}

type ReviewRow = {
  id: string
  place_id: string
  author_user_id: string
  author_name: string
  content: string
  created_at: string
  rating_score: number
}

export type PersistedReviewDraft = {
  rating_score: number
  review_content: string
}

export type PersistedPlaceRegistrationDraft = {
  place_type: PlaceType
  zeropay_status: ZeropayStatus
  rating_score: number
  review_content: string
}

export type PersistedPlaceRegistrationResult =
  | {
      status: 'created' | 'merged' | 'updated'
      place: PlaceSummary
      places: PlaceSummary[]
      message: '장소를 추가했어요.' | '기존 장소에 정보를 합쳤어요.' | '기존 장소에 정보를 반영했어요.'
    }
  | {
      status: 'confirm_required'
      reason: 'merge_place' | 'overwrite_review'
      place: PlaceSummary
      confirmMessage: typeof DUPLICATE_PLACE_CONFIRM_MESSAGE | typeof OVERWRITE_REVIEW_CONFIRM_MESSAGE
    }
  | {
      status: 'error'
      message: typeof PLACE_SAVE_FAILED_MESSAGE
    }

export type PersistedReviewMutationResult =
  | {
      status: 'saved'
      place: PlaceSummary
    }
  | {
      status: 'existing_review'
      place: PlaceSummary
      message: '이미 리뷰를 남긴 장소예요'
    }
  | {
      status: 'error'
      message: typeof REVIEW_SAVE_FAILED_MESSAGE
    }

const roundAverage = (value: number) => Math.round(value * 10) / 10
const toUiDate = (value: string) => value.slice(0, 10)
const normalizeDuplicateValue = (value: string | null | undefined) =>
  (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

const mapReviewRow = (row: ReviewRow): ReviewSummary => ({
  id: row.id,
  author_name: row.author_name,
  content: row.content,
  created_at: toUiDate(row.created_at),
  rating_score: row.rating_score,
})

const buildPlaceSummary = ({
  place,
  reviews,
  viewerUserId,
}: {
  place: PlaceRow
  reviews: ReviewRow[]
  viewerUserId: string | null
}): PlaceSummary => {
  const placeReviews = reviews
    .filter((review) => review.place_id === place.id)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
  const myReviewRow = viewerUserId
    ? placeReviews.find((review) => review.author_user_id === viewerUserId) ?? null
    : null

  const mappedReviews = placeReviews.map(mapReviewRow)
  const myReview = myReviewRow ? mapReviewRow(myReviewRow) : null

  return {
    id: place.id,
    naver_place_id: place.naver_place_id,
    naver_place_url: place.naver_place_url,
    name: place.name,
    road_address: place.road_address,
    latitude: place.latitude ?? undefined,
    longitude: place.longitude ?? undefined,
    place_type: place.place_type,
    zeropay_status: place.zeropay_status,
    average_rating: roundAverage(Number(place.average_rating ?? 0)),
    review_count: Number(place.review_count ?? 0),
    added_by_name: place.added_by_name,
    my_review: myReview,
    reviews: mappedReviews,
  }
}

const loadPlaceRows = async ({
  client,
  placeId,
}: {
  client: PoolClient
  placeId?: string
}) => {
  const { rows } = await client.query<PlaceRow>(
    `
      select
        p.id,
        p.naver_place_id,
        p.naver_place_url,
        p.name,
        p.road_address,
        p.latitude,
        p.longitude,
        p.place_type,
        p.zeropay_status,
        coalesce(round(avg(r.rating_score)::numeric, 1), 0)::float8 as average_rating,
        count(r.id)::int as review_count,
        coalesce(creator.name, split_part(creator.email, '@', 1)) as added_by_name
      from public.places p
      join public.user_profiles creator
        on creator.id = p.created_by_user_id
      left join public.place_reviews r
        on r.place_id = p.id
      where ($1::uuid is null or p.id = $1::uuid)
      group by p.id, creator.name, creator.email
      order by p.created_at desc
    `,
    [placeId ?? null],
  )

  return rows
}

const loadMatchingPlaceRow = async ({
  client,
  lookupData,
}: {
  client: PoolClient
  lookupData: PlaceLookupSuccess['data']
}) => {
  const normalizedName = normalizeDuplicateValue(lookupData.name)
  const normalizedRoadAddress = normalizeDuplicateValue(
    lookupData.road_address ?? lookupData.representative_address ?? lookupData.land_lot_address ?? '',
  )

  const { rows } = await client.query<PlaceRow>(
    `
      select
        p.id,
        p.naver_place_id,
        p.naver_place_url,
        p.name,
        p.road_address,
        p.latitude,
        p.longitude,
        p.place_type,
        p.zeropay_status,
        coalesce(round(avg(r.rating_score)::numeric, 1), 0)::float8 as average_rating,
        count(r.id)::int as review_count,
        coalesce(creator.name, split_part(creator.email, '@', 1)) as added_by_name
      from public.places p
      join public.user_profiles creator
        on creator.id = p.created_by_user_id
      left join public.place_reviews r
        on r.place_id = p.id
      where
        p.naver_place_id = $1
        or (
          p.normalized_name = $2
          and p.normalized_road_address = $3
        )
      group by p.id, creator.name, creator.email
      order by p.created_at desc
      limit 1
    `,
    [lookupData.naver_place_id, normalizedName, normalizedRoadAddress],
  )

  return rows[0] ?? null
}

const loadReviewRows = async ({
  client,
  placeIds,
}: {
  client: PoolClient
  placeIds: string[]
}) => {
  if (placeIds.length === 0) {
    return [] as ReviewRow[]
  }

  const { rows } = await client.query<ReviewRow>(
    `
      select
        r.id,
        r.place_id,
        r.author_user_id,
        coalesce(author.name, split_part(author.email, '@', 1)) as author_name,
        r.content,
        r.created_at::text as created_at,
        r.rating_score
      from public.place_reviews r
      join public.user_profiles author
        on author.id = r.author_user_id
      where r.place_id = any($1::uuid[])
      order by r.created_at desc
    `,
    [placeIds],
  )

  return rows
}

const listPlacesForUserWithClient = async ({
  client,
  viewerUserId,
}: {
  client: PoolClient
  viewerUserId: string | null
}) => {
  const places = await loadPlaceRows({ client })
  const reviews = await loadReviewRows({
    client,
    placeIds: places.map((place) => place.id),
  })

  return places.map((place) =>
    buildPlaceSummary({
      place,
      reviews,
      viewerUserId,
    }))
}

export const listPlacesForUser = async (viewerUserId: string | null) =>
  withDatabaseConnection(async (client) =>
    listPlacesForUserWithClient({
      client,
      viewerUserId,
    }))

const getPlaceDetailForUserWithClient = async ({
  client,
  placeId,
  viewerUserId,
}: {
  client: PoolClient
  placeId: string
  viewerUserId: string | null
}) => {
  const places = await loadPlaceRows({
    client,
    placeId,
  })
  const place = places[0]
  if (!place) {
    return null
  }

  const reviews = await loadReviewRows({
    client,
    placeIds: [place.id],
  })

  return buildPlaceSummary({
    place,
    reviews,
    viewerUserId,
  })
}

export const getPlaceDetailForUser = async ({
  placeId,
  viewerUserId,
}: {
  placeId: string
  viewerUserId: string | null
}) =>
  withDatabaseConnection(async (client) =>
    getPlaceDetailForUserWithClient({
      client,
      placeId,
      viewerUserId,
    }))

const validateReviewDraft = (draft: PersistedReviewDraft) => {
  if (draft.rating_score < 1 || draft.rating_score > 5) {
    return '별점은 1점에서 5점 사이여야 해요.'
  }

  if (draft.review_content.length > REVIEW_LIMIT) {
    return '리뷰는 500자 이하로 입력해주세요.'
  }

  return null
}

const validatePlaceRegistrationDraft = (draft: PersistedPlaceRegistrationDraft) => {
  if (!['restaurant', 'cafe'].includes(draft.place_type)) {
    return PLACE_SAVE_FAILED_MESSAGE
  }

  if (!['available', 'unavailable', 'needs_verification'].includes(draft.zeropay_status)) {
    return PLACE_SAVE_FAILED_MESSAGE
  }

  if (draft.rating_score < 1 || draft.rating_score > 5) {
    return PLACE_SAVE_FAILED_MESSAGE
  }

  if (draft.review_content.length > REVIEW_LIMIT) {
    return PLACE_SAVE_FAILED_MESSAGE
  }

  return null
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

export const persistPlaceRegistration = async ({
  confirmDuplicate = false,
  draft,
  lookupData,
  userId,
}: {
  confirmDuplicate?: boolean
  draft: PersistedPlaceRegistrationDraft
  lookupData: PlaceLookupSuccess['data']
  userId: string
}): Promise<PersistedPlaceRegistrationResult> => {
  const validationError = validatePlaceRegistrationDraft(draft)
  if (validationError) {
    return {
      status: 'error',
      message: PLACE_SAVE_FAILED_MESSAGE,
    }
  }

  return withDatabaseTransaction(async (client) => {
    const existingPlace = await loadMatchingPlaceRow({
      client,
      lookupData,
    })

    const existingReviewResult = existingPlace
      ? await client.query<{ id: string; content: string }>(
          `
            select id, content
            from public.place_reviews
            where place_id = $1
              and author_user_id = $2
            limit 1
          `,
          [existingPlace.id, userId],
        )
      : { rows: [] as Array<{ id: string; content: string }> }

    const existingReview = existingReviewResult.rows[0] ?? null

    if (existingPlace && !confirmDuplicate) {
      const place = await getPlaceDetailForUserWithClient({
        client,
        placeId: existingPlace.id,
        viewerUserId: userId,
      })

      return {
        status: 'confirm_required',
        reason: existingReview ? 'overwrite_review' : 'merge_place',
        place: place as PlaceSummary,
        confirmMessage: existingReview
          ? OVERWRITE_REVIEW_CONFIRM_MESSAGE
          : DUPLICATE_PLACE_CONFIRM_MESSAGE,
      }
    }

    let placeId = existingPlace?.id ?? null
    let mutationStatus: 'created' | 'merged' | 'updated' = 'created'

    if (!existingPlace) {
      const { rows } = await client.query<{ id: string }>(
        `
          insert into public.places (
            naver_place_id,
            naver_place_url,
            name,
            road_address,
            land_lot_address,
            latitude,
            longitude,
            place_type,
            zeropay_status,
            created_by_user_id
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          returning id
        `,
        [
          lookupData.naver_place_id,
          lookupData.canonical_url,
          lookupData.name,
          lookupData.road_address ?? lookupData.representative_address ?? '',
          lookupData.land_lot_address,
          lookupData.latitude,
          lookupData.longitude,
          draft.place_type,
          draft.zeropay_status,
          userId,
        ],
      )
      placeId = rows[0]?.id ?? null
      mutationStatus = 'created'
    } else {
      await client.query(
        `
          update public.places
          set
            naver_place_id = $2,
            naver_place_url = $3,
            name = $4,
            road_address = $5,
            land_lot_address = $6,
            latitude = $7,
            longitude = $8,
            place_type = $9,
            zeropay_status = $10
          where id = $1
        `,
        [
          existingPlace.id,
          lookupData.naver_place_id,
          lookupData.canonical_url,
          lookupData.name,
          lookupData.road_address ?? lookupData.representative_address ?? existingPlace.road_address,
          lookupData.land_lot_address,
          lookupData.latitude,
          lookupData.longitude,
          draft.place_type,
          mergeZeropayStatus(existingPlace.zeropay_status, draft.zeropay_status),
        ],
      )

      mutationStatus = existingReview ? 'updated' : 'merged'
      placeId = existingPlace.id
    }

    if (!placeId) {
      return {
        status: 'error',
        message: PLACE_SAVE_FAILED_MESSAGE,
      }
    }

    if (existingReview) {
      await client.query(
        `
          update public.place_reviews
          set
            rating_score = $3,
            content = $4
          where id = $1
            and author_user_id = $2
        `,
        [
          existingReview.id,
          userId,
          draft.rating_score,
          draft.review_content.trim() === '' ? existingReview.content : draft.review_content,
        ],
      )
    } else {
      await client.query(
        `
          insert into public.place_reviews (
            place_id,
            author_user_id,
            rating_score,
            content
          )
          values ($1, $2, $3, $4)
        `,
        [placeId, userId, draft.rating_score, draft.review_content],
      )
    }

    const place = await getPlaceDetailForUserWithClient({
      client,
      placeId,
      viewerUserId: userId,
    })
    const places = await listPlacesForUserWithClient({
      client,
      viewerUserId: userId,
    })

    if (!place) {
      return {
        status: 'error',
        message: PLACE_SAVE_FAILED_MESSAGE,
      }
    }

    return {
      status: mutationStatus,
      place,
      places,
      message:
        mutationStatus === 'created'
          ? '장소를 추가했어요.'
          : mutationStatus === 'merged'
            ? '기존 장소에 정보를 합쳤어요.'
            : '기존 장소에 정보를 반영했어요.',
    }
  })
}

export const submitPersistedPlaceReview = async ({
  allowOverwrite = false,
  draft,
  placeId,
  userId,
}: {
  allowOverwrite?: boolean
  draft: PersistedReviewDraft
  placeId: string
  userId: string
}): Promise<PersistedReviewMutationResult> => {
  const validationError = validateReviewDraft(draft)
  if (validationError) {
    return {
      status: 'error',
      message: REVIEW_SAVE_FAILED_MESSAGE,
    }
  }

  return withDatabaseTransaction(async (client) => {
    const existingPlace = await loadPlaceRows({ client, placeId })
    const place = existingPlace[0]
    if (!place) {
      return {
        status: 'error',
        message: REVIEW_SAVE_FAILED_MESSAGE,
      } satisfies PersistedReviewMutationResult
    }

    const existingReviewResult = await client.query<{
      id: string
      content: string
      rating_score: number
    }>(
      `
        select id, content, rating_score
        from public.place_reviews
        where place_id = $1
          and author_user_id = $2
        limit 1
      `,
      [placeId, userId],
    )

    const existingReview = existingReviewResult.rows[0] ?? null
    if (existingReview && !allowOverwrite) {
      const currentPlace = await getPlaceDetailForUserWithClient({
        client,
        placeId,
        viewerUserId: userId,
      })

      return {
        status: 'existing_review',
        place: currentPlace as PlaceSummary,
        message: '이미 리뷰를 남긴 장소예요',
      }
    }

    if (existingReview) {
      await client.query(
        `
          update public.place_reviews
          set
            rating_score = $3,
            content = $4
          where id = $1
            and author_user_id = $2
        `,
        [
          existingReview.id,
          userId,
          draft.rating_score,
          draft.review_content.trim() === ''
            ? existingReview.content
            : draft.review_content,
        ],
      )
    } else {
      await client.query(
        `
          insert into public.place_reviews (
            place_id,
            author_user_id,
            rating_score,
            content
          )
          values ($1, $2, $3, $4)
        `,
        [placeId, userId, draft.rating_score, draft.review_content],
      )
    }

    const nextPlace = await getPlaceDetailForUserWithClient({
      client,
      placeId,
      viewerUserId: userId,
    })

    if (!nextPlace) {
      return {
        status: 'error',
        message: REVIEW_SAVE_FAILED_MESSAGE,
      } satisfies PersistedReviewMutationResult
    }

    return {
      status: 'saved',
      place: nextPlace,
    } satisfies PersistedReviewMutationResult
  })
}
