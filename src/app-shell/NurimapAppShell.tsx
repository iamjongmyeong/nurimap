import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { MapPane } from './MapPane'
import { useAuth } from '../auth/authContext'
import { DesktopPlaceAddPanel, MobilePlaceAddPage } from './PlaceAddPanels'
import { createInitialReviewDraft, validateReviewDraft, type ReviewDraft } from './placeRepository'
import {
  useAppShellStore,
  type NavigationState,
  type PlaceDetailLoadState,
  type PlaceListLoadState,
} from './appShellStore'
import type { PlaceSummary, PlaceType } from './types'
import { useViewportMode } from './useViewportMode'

type PlaceWithCoordinates = PlaceSummary & {
  latitude: number
  longitude: number
}

const hasCoordinates = (place: PlaceSummary): place is PlaceWithCoordinates =>
  place.latitude !== undefined && place.longitude !== undefined

const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  restaurant: '식당',
  cafe: '카페',
}

const BROWSE_PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  restaurant: '음식점',
  cafe: '카페',
}

const BRAND_LOGO_SRC = '/assets/branding/brand-nurimap-logo.jpeg'
const PLACE_TYPE_ACCENT_ICON: Record<PlaceType, string> = {
  restaurant: '/assets/icons/icon-place-type-restaurant-accent.svg',
  cafe: '/assets/icons/icon-place-type-cafe-accent.svg',
}
const PLACE_TYPE_MUTED_ICON: Record<PlaceType, string> = {
  restaurant: '/assets/icons/icon-place-type-restaurant-muted.svg',
  cafe: '/assets/icons/icon-place-type-cafe-muted.svg',
}
const PLUS_ICON_SRC = '/assets/icons/icon-action-add.svg'
const ZEROPAY_ICON_SRC = '/assets/icons/icon-payment-zeropay-muted.svg'
const ZEROPAY_ACCENT_ICON_SRC = '/assets/icons/icon-payment-zeropay-accent.svg'
const LIST_STAR_ICON_SRC = '/assets/icons/icon-rating-star-red-16.svg'
const PLACE_ADDRESS_ICON_SRC = '/assets/icons/icon-place-address-muted.svg'
const PLACE_ADDED_BY_ICON_SRC = '/assets/icons/icon-place-added-by-muted.svg'
const DETAIL_BACK_ICON_SRC = '/assets/icons/icon-navigation-back-24.svg'
const LOGOUT_CONFIRM_MESSAGE = '로그아웃하시겠어요?'
const ZEROPAY_TOOLTIP_DELAY_MS = 400
const DETAIL_ROUTE_PREFIX = '/places/'
const STAR_PATH =
  'M11.9995 19.3643L6.46613 22.6977C6.22168 22.8532 5.96613 22.9199 5.69946 22.8977C5.4328 22.8754 5.19946 22.7865 4.99946 22.631C4.79946 22.4754 4.64391 22.2812 4.5328 22.0483C4.42168 21.8154 4.39946 21.5541 4.46613 21.2643L5.9328 14.9643L1.0328 10.731C0.810573 10.531 0.671906 10.303 0.616795 10.047C0.561684 9.79099 0.578129 9.54121 0.666129 9.29766C0.754129 9.0541 0.887462 8.8541 1.06613 8.69766C1.2448 8.54121 1.48924 8.44121 1.79946 8.39766L8.26613 7.83099L10.7661 1.89766C10.8772 1.63099 11.0497 1.43099 11.2835 1.29766C11.5172 1.16432 11.7559 1.09766 11.9995 1.09766C12.243 1.09766 12.4817 1.16432 12.7155 1.29766C12.9492 1.43099 13.1217 1.63099 13.2328 1.89766L15.7328 7.83099L22.1995 8.39766C22.5106 8.4421 22.755 8.5421 22.9328 8.69766C23.1106 8.85321 23.2439 9.05321 23.3328 9.29766C23.4217 9.5421 23.4386 9.79232 23.3835 10.0483C23.3284 10.3043 23.1892 10.5319 22.9661 10.731L18.0661 14.9643L19.5328 21.2643C19.5995 21.5532 19.5772 21.8145 19.4661 22.0483C19.355 22.2821 19.1995 22.4763 18.9995 22.631C18.7995 22.7857 18.5661 22.8745 18.2995 22.8977C18.0328 22.9208 17.7772 22.8541 17.5328 22.6977L11.9995 19.3643Z'

const EmptyState = () => (
  <div className="rounded-[28px] border border-dashed border-[#d9d9e7] bg-white px-5 py-8 text-left shadow-[0_20px_60px_rgba(40,47,88,0.08)]">
    <p className="text-sm font-semibold text-[#222127]">아직 등록된 장소가 없어요</p>
    <p className="mt-2 text-sm leading-6 text-[#7e7b8b]">조건에 맞는 장소가 생기면 이 영역에 먼저 보여드릴게요.</p>
  </div>
)

const LoadingState = () => (
  <div className="flex items-center gap-3 rounded-[28px] bg-white px-5 py-6 shadow-[0_20px_60px_rgba(40,47,88,0.08)]" data-testid="place-list-loading">
    <span className="loading loading-spinner loading-md text-primary" />
    <div>
      <p className="text-sm font-semibold text-[#222127]">장소 목록을 불러오는 중이에요</p>
      <p className="text-sm text-[#7e7b8b]">잠시만 기다려 주세요.</p>
    </div>
  </div>
)

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="rounded-[28px] bg-white px-5 py-6 shadow-[0_20px_60px_rgba(40,47,88,0.08)]" data-testid="place-list-error">
    <p className="text-sm font-semibold text-error">장소 목록을 불러오지 못했어요</p>
    <p className="mt-2 text-sm text-[#7e7b8b]">기본 에러 상태는 유지하고, 재시도만 제공해요.</p>
    <button className="btn btn-outline btn-sm mt-4 rounded-full" onClick={onRetry} type="button">
      다시 시도
    </button>
  </div>
)

const StarIcon = ({ className = 'h-4 w-4 text-[#ff6b6b]' }: { className?: string }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d={STAR_PATH} fill="currentColor" />
  </svg>
)

const ListStarIcon = ({ className = 'h-4 w-4', testId }: { className?: string; testId?: string }) => (
  <img
    alt=""
    aria-hidden="true"
    className={className}
    data-testid={testId}
    src={LIST_STAR_ICON_SRC}
  />
)

const PlaceTypeIcon = ({
  className = 'h-4 w-4',
  emphasized = false,
  placeType,
  testId,
}: {
  className?: string
  emphasized?: boolean
  placeType: PlaceType
  testId?: string
}) => (
  <img
    alt=""
    aria-hidden="true"
    className={className}
    data-testid={testId}
    src={emphasized ? PLACE_TYPE_ACCENT_ICON[placeType] : PLACE_TYPE_MUTED_ICON[placeType]}
  />
)

const PlusIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <img alt="" aria-hidden="true" className={className} src={PLUS_ICON_SRC} />
)

const ZeroPayIndicator = () => (
  <img
    alt="제로페이 가능"
    className="h-4 w-4"
    data-testid="detail-zeropay-indicator"
    src={ZEROPAY_ICON_SRC}
  />
)

const BackIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <img alt="" aria-hidden="true" className={className} src={DETAIL_BACK_ICON_SRC} />
)

const LocationIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <img alt="" aria-hidden="true" className={className} src={PLACE_ADDRESS_ICON_SRC} />
)

const PersonIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <img alt="" aria-hidden="true" className={className} src={PLACE_ADDED_BY_ICON_SRC} />
)

const MetaReviewStarIcon = ({ className = 'h-4 w-4 text-[#8b8894]' }: { className?: string }) => (
  <StarIcon className={className} />
)

const formatReviewDate = (value: string) => value.replaceAll('-', '.')

const parseReviewTimestamp = (value: string) => {
  const normalized = value.includes('.') ? value.replaceAll('.', '-') : value
  const timestamp = Date.parse(normalized)

  return Number.isNaN(timestamp) ? 0 : timestamp
}

const getDetailRoutePath = (placeId: string) => `${DETAIL_ROUTE_PREFIX}${encodeURIComponent(placeId)}`

const getPlaceIdFromPathname = (pathname: string) => {
  if (!pathname.startsWith(DETAIL_ROUTE_PREFIX)) {
    return null
  }

  const encodedPlaceId = pathname.slice(DETAIL_ROUTE_PREFIX.length)
  if (!encodedPlaceId) {
    return null
  }

  try {
    return decodeURIComponent(encodedPlaceId)
  } catch {
    return null
  }
}

const BrandBlock = ({ compact = false }: { compact?: boolean }) => (
  <div className="flex items-center gap-3">
    <img
      alt="Nurimedia 로고"
      className={compact ? 'h-12 w-12 rounded-[18px] object-cover shadow-sm' : 'h-14 w-14 rounded-[20px] object-cover shadow-sm'}
      src={BRAND_LOGO_SRC}
    />
    <div>
      <p className="brand-display text-[26px] leading-none text-[#1f1f25]">NuriMap</p>
      <p className="mt-1 text-xs font-medium tracking-[0.18em] text-[#7d7a88] uppercase">Local lunch radar</p>
    </div>
  </div>
)

const DesktopBrowseBrand = () => (
  <div className="flex items-center gap-3">
    <img alt="Nurimedia 로고" className="h-9 w-9 rounded-[12px] object-cover" src={BRAND_LOGO_SRC} />
    <p className="brand-display text-2xl leading-none text-[#1c1c1c]">누리맵</p>
  </div>
)

const RatingMeta = ({ averageRating, testId }: { averageRating: number; testId?: string }) => (
  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1c1c1c]">
    <ListStarIcon className="h-4 w-4" testId={testId} />
    {averageRating.toFixed(1)}
  </span>
)

const ReviewMeta = ({ reviewCount }: { reviewCount: number }) => (
  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#7a7a7a]">
    <span>리뷰</span>
    <span>{reviewCount}</span>
  </span>
)

const ListZeroPayIcon = ({ placeId }: { placeId: string }) => {
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const tooltipTimerRef = useRef<number | null>(null)

  const clearTooltipTimer = () => {
    if (tooltipTimerRef.current !== null) {
      window.clearTimeout(tooltipTimerRef.current)
      tooltipTimerRef.current = null
    }
  }

  useEffect(() => () => {
    clearTooltipTimer()
  }, [])

  const handleMouseEnter = () => {
    clearTooltipTimer()
    tooltipTimerRef.current = window.setTimeout(() => {
      setTooltipVisible(true)
    }, ZEROPAY_TOOLTIP_DELAY_MS)
  }

  const handleMouseLeave = () => {
    clearTooltipTimer()
    setTooltipVisible(false)
  }

  return (
    <span
      className="relative inline-flex h-4 w-4 shrink-0"
      data-testid={`place-list-zeropay-trigger-${placeId}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        alt=""
        aria-hidden="true"
        className="h-4 w-4 shrink-0"
        data-testid={`place-list-zeropay-icon-${placeId}`}
        src={ZEROPAY_ACCENT_ICON_SRC}
      />
      {tooltipVisible ? (
        <span
          className="absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-md bg-[#1f1f1f] px-2 py-1 text-[11px] font-medium leading-none text-white shadow-[0_8px_24px_rgba(31,31,31,0.2)]"
          data-testid={`place-list-zeropay-tooltip-${placeId}`}
          role="tooltip"
        >
          제로페이 가능
        </span>
      ) : null}
    </span>
  )
}

const PlaceListItem = ({
  onSelect,
  place,
  selected,
  showDivider,
}: {
  onSelect: (placeId: string) => void
  place: PlaceSummary
  selected: boolean
  showDivider: boolean
}) => (
  <div>
    <button
      className={`w-full cursor-pointer bg-white px-6 text-left transition-colors ${
        selected ? 'bg-[#f7f8ff]' : ''
      }`}
      data-testid={`place-list-item-${place.id}`}
      onClick={() => onSelect(place.id)}
      type="button"
    >
      <div className="flex h-24 flex-col py-5">
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-base font-medium leading-6 text-[#1f1f1f]">{place.name}</p>
          {place.zeropay_status === 'available' ? (
            <ListZeroPayIcon placeId={place.id} />
          ) : null}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <RatingMeta averageRating={place.average_rating} testId={`place-list-rating-icon-${place.id}`} />
          <ReviewMeta reviewCount={place.review_count} />
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#7a7a7a]">
            <PlaceTypeIcon
              className="h-4 w-4 shrink-0"
              placeType={place.place_type}
              testId={`place-list-type-icon-${place.id}`}
            />
            <span>{BROWSE_PLACE_TYPE_LABEL[place.place_type]}</span>
          </span>
        </div>
      </div>
    </button>
    {showDivider ? <div aria-hidden="true" className="mx-6 my-1 border-b border-[#f0f0f0]" /> : null}
  </div>
)

const PlaceListPanel = ({
  places,
  selectedPlaceId,
  status,
  onRetry,
  onSelect,
}: {
  places: PlaceSummary[]
  selectedPlaceId: string | null
  status: PlaceListLoadState
  onRetry: () => void
  onSelect: (placeId: string) => void
}) => {
  if (status === 'loading') {
    return <LoadingState />
  }

  if (status === 'error') {
    return <ErrorState onRetry={onRetry} />
  }

  if (status === 'empty' || places.length === 0) {
    return <EmptyState />
  }

  return (
    <div data-testid="place-list-ready">
      {places.map((place, index) => (
        <PlaceListItem
          key={place.id}
          onSelect={onSelect}
          place={place}
          selected={selectedPlaceId === place.id}
          showDivider={index < places.length - 1}
        />
      ))}
    </div>
  )
}

const DetailLoadingState = () => (
  <div className="mt-6 flex items-center gap-3 rounded-[28px] bg-[#f6f6fb] p-5" data-testid="place-detail-loading">
    <span className="loading loading-spinner loading-md text-primary" />
    <div>
      <p className="text-sm font-semibold text-[#222127]">상세 정보를 불러오는 중이에요</p>
      <p className="text-sm text-[#7e7b8b]">기본 로딩 상태를 그대로 유지합니다.</p>
    </div>
  </div>
)

const DetailErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="mt-6 rounded-[28px] bg-[#f6f6fb] p-5" data-testid="place-detail-error">
    <p className="text-sm font-semibold text-error">상세 정보를 불러오지 못했어요</p>
    <p className="mt-2 text-sm text-[#7e7b8b]">상세 화면에서 바로 재시도할 수 있어요.</p>
    <button className="btn btn-outline btn-sm mt-4 rounded-full" onClick={onRetry} type="button">
      다시 시도
    </button>
  </div>
)

export const DetailReviewComposer = ({
  onSubmit,
  placeId,
}: {
  onSubmit: (placeId: string, draft: ReviewDraft) => { status: 'saved' | 'existing_review' | 'error'; message?: string }
  placeId: string
}) => {
  const [draft, setDraft] = useState(createInitialReviewDraft)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSave = async () => {
    const validationError = validateReviewDraft(draft)
    if (validationError) {
      setSubmitState('error')
      setErrorMessage(validationError)
      return
    }

    setSubmitState('submitting')
    setErrorMessage(null)
    await new Promise((resolve) => setTimeout(resolve, 50))

    const result = onSubmit(placeId, draft)
    if (result.status !== 'saved') {
      setSubmitState('error')
      setErrorMessage(result.message ?? '리뷰를 저장하지 못했어요. 다시 시도해 주세요.')
      return
    }

    setSubmitState('idle')
  }

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-base-300 bg-base-100 p-4" data-testid="detail-review-compose">
      <h4 className="text-sm font-semibold text-base-content">리뷰 작성</h4>
      <p className="mt-2 text-sm text-base-content/70">별점과 리뷰를 함께 남길 수 있습니다.</p>

      <div className="mt-4 space-y-2" data-testid="detail-review-rating-field">
        <p className="text-sm font-semibold text-base-content">별점</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              aria-label={`상세 별점 ${value}점`}
              className={`btn btn-circle btn-sm ${value <= draft.rating_score ? 'btn-warning' : 'btn-ghost'}`}
              data-testid={`detail-review-rating-star-${value}`}
              disabled={submitState === 'submitting'}
              key={value}
              onClick={() => setDraft((current) => ({ ...current, rating_score: value }))}
              type="button"
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="form-control mt-4 w-full gap-2">
        <span className="label-text font-semibold text-base-content">리뷰</span>
        <textarea
          className="textarea textarea-bordered min-h-28"
          data-testid="detail-review-content-input"
          disabled={submitState === 'submitting'}
          onChange={(event) => setDraft((current) => ({ ...current, review_content: event.target.value }))}
          value={draft.review_content}
        />
        <span className="label-text-alt text-base-content/60">{draft.review_content.length} / 500</span>
      </label>

      {errorMessage ? <p className="mt-3 text-sm text-error">{errorMessage}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="btn btn-primary rounded-2xl"
          data-testid="detail-review-submit-button"
          disabled={submitState === 'submitting'}
          onClick={() => {
            void handleSave()
          }}
          type="button"
        >
          {submitState === 'submitting' ? '저장 중...' : '리뷰 저장'}
        </button>
      </div>

      {submitState === 'submitting' ? (
        <div className="mt-4 rounded-2xl bg-base-200 p-4 text-sm text-base-content/80" data-testid="detail-review-submit-loading">
          리뷰를 저장하는 중입니다.
        </div>
      ) : null}
    </div>
  )
}

export const DetailRecommendationControl = ({
  active,
  canRecommend,
  onToggle,
}: {
  active: boolean
  canRecommend: boolean
  onToggle: () => { status: 'toggled' | 'error'; message?: string }
}) => {
  const [toggleState, setToggleState] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleToggle = async () => {
    if (!canRecommend) {
      setToggleState('error')
      setErrorMessage('로그인 후에 추천할 수 있어요.')
      return
    }

    setToggleState('submitting')
    setErrorMessage(null)
    await new Promise((resolve) => setTimeout(resolve, 50))

    const result = onToggle()
    if (result.status === 'error') {
      setToggleState('error')
      setErrorMessage(result.message ?? '추천 상태를 변경하지 못했어요. 다시 시도해 주세요.')
      return
    }

    setToggleState('idle')
  }

  return (
    <div className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-4" data-testid="detail-recommendation-control">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-base-content">추천</h4>
        <button
          className={`btn rounded-2xl ${active ? 'btn-secondary' : 'btn-primary'}`}
          data-testid="detail-recommendation-button"
          disabled={toggleState === 'submitting'}
          onClick={() => {
            void handleToggle()
          }}
          type="button"
        >
          {toggleState === 'submitting' ? '처리 중...' : active ? '추천 취소' : '추천'}
        </button>
      </div>

      {toggleState === 'submitting' ? (
        <div className="mt-4 rounded-2xl bg-base-200 p-4 text-sm text-base-content/80" data-testid="detail-recommendation-loading">
          추천 상태를 변경하는 중입니다.
        </div>
      ) : null}

      {errorMessage ? <p className="mt-3 text-sm text-error">{errorMessage}</p> : null}
    </div>
  )
}

const DetailMetaRow = ({
  children,
  icon,
  testId,
}: {
  children: ReactNode
  icon: ReactNode
  testId?: string
}) => (
  <div className="flex items-center gap-2 text-sm font-medium leading-4 text-[#8b8894]" data-testid={testId}>
    {icon}
    <div>{children}</div>
  </div>
)

const ReviewStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-1" data-testid="detail-review-stars">
    {Array.from({ length: 5 }, (_, index) => (
      <StarIcon
        key={index}
        className={`h-4 w-4 ${index < Math.round(rating) ? 'text-[#e53935]' : 'text-[#8b8894]'}`}
      />
    ))}
  </div>
)

const ReviewItem = ({ review }: { review: PlaceSummary['reviews'][number] }) => (
  <article className="flex flex-col gap-2" data-testid={`detail-review-item-${review.id}`}>
    <div className="flex items-start justify-between gap-3">
      <p className="text-base font-medium leading-6 text-[#1f1f1f]">{review.author_name}</p>
      <span className="text-xs leading-4 text-[#8b8894]">{formatReviewDate(review.created_at)}</span>
    </div>
    <span className="sr-only">{review.rating_score.toFixed(1)}</span>
    <ReviewStars rating={review.rating_score} />
    {review.content.trim() !== '' ? (
      <p className="text-sm leading-6 text-[#1f1f1f]" data-testid={`detail-review-content-${review.id}`}>
        {review.content}
      </p>
    ) : null}
  </article>
)

const DetailCard = ({ place }: { place: PlaceSummary }) => {
  const sortedReviews = [...place.reviews].sort(
    (left, right) => parseReviewTimestamp(right.created_at) - parseReviewTimestamp(left.created_at),
  )

  return (
    <div data-testid="place-detail-ready">
      <section className="px-6 pb-6 pt-4" data-testid="detail-info-section">
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-medium leading-7 text-[#1f1f1f]">{place.name}</h2>

          <div className="flex flex-col gap-4">
            <DetailMetaRow icon={<LocationIcon />} testId="detail-address-row">
              <span data-testid="detail-address">{place.road_address}</span>
            </DetailMetaRow>

            <DetailMetaRow icon={<PersonIcon />} testId="detail-added-by">
              <span>{place.added_by_name}님이 추가한 장소</span>
            </DetailMetaRow>

            <DetailMetaRow icon={<PlaceTypeIcon className="h-4 w-4 opacity-70" placeType={place.place_type} />}>
              <span data-testid="detail-meta-type">{PLACE_TYPE_LABEL[place.place_type]}</span>
            </DetailMetaRow>

            {place.zeropay_status === 'available' ? (
              <DetailMetaRow icon={<ZeroPayIndicator />} testId="detail-zeropay-row">
                <span>제로페이 가능</span>
              </DetailMetaRow>
            ) : null}

            <DetailMetaRow icon={<MetaReviewStarIcon />} testId="detail-meta-rating">
              <span>{place.average_rating.toFixed(1)} ({place.review_count})</span>
            </DetailMetaRow>
          </div>
        </div>
      </section>

      <div className="h-1 bg-[#F0F0F0]" />

      <section className="px-6 py-6" data-testid="detail-review-section">
        <div className="mb-6">
          <p className="text-sm font-medium leading-5 text-[#8b8894]">평가 및 리뷰</p>
          <span className="sr-only">리뷰 {place.review_count}</span>
        </div>

        <div className="flex flex-col gap-6" data-testid="detail-review-list">
          {sortedReviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      </section>
    </div>
  )
}

const DetailBody = ({
  onRetry,
  place,
  status,
}: {
  onRetry: () => void
  place: PlaceSummary | undefined
  status: PlaceDetailLoadState
}) => {
  if (status === 'loading') {
    return <DetailLoadingState />
  }

  if (status === 'error') {
    return <DetailErrorState onRetry={onRetry} />
  }

  if (!place) {
    return (
      <div className="mt-6 rounded-[28px] border border-dashed border-[#dbdbe6] bg-white p-5">
        <p className="text-sm font-medium text-[#222127]">선택된 장소가 아직 없어요</p>
        <p className="mt-2 text-sm leading-6 text-[#7e7b8b]">목록이나 지도 마커를 선택하면 상세가 열립니다.</p>
      </div>
    )
  }

  return <DetailCard place={place} />
}

const DetailHeader = ({
  ariaLabel,
  onBack,
  title,
  useNegativeInset = false,
}: {
  ariaLabel: string
  onBack: () => void
  title: string
  useNegativeInset?: boolean
}) => (
  <div
    className={`${useNegativeInset ? '-mx-6 -mt-6' : ''} sticky top-0 z-10 h-14 bg-white`}
    data-testid="detail-header"
  >
    <div className="relative h-full">
      <button
        aria-label={ariaLabel}
        className="absolute left-6 top-6 inline-flex h-6 w-6 cursor-pointer items-center justify-center text-[#1f1f1f]"
        onClick={onBack}
        type="button"
      >
        <BackIcon />
      </button>
      <h2 className="sr-only">{title}</h2>
    </div>
  </div>
)

const DesktopBrowseTopBar = ({ onOpenPlaceAdd }: { onOpenPlaceAdd: () => void }) => (
  <div className="relative -mx-6 -mt-6 z-10 h-[76px] shrink-0 overflow-hidden bg-white" data-testid="desktop-browse-topbar">
    <div className="absolute left-6 top-6">
      <DesktopBrowseBrand />
    </div>
    <button
      aria-label="장소 추가"
      className="absolute right-6 top-6 inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl bg-[#5862fb] px-4 text-base font-[600] text-white"
      data-testid="desktop-add-button"
      onClick={onOpenPlaceAdd}
      type="button"
    >
      <PlusIcon className="h-4 w-4" />
      추가
    </button>
  </div>
)

const DesktopBrowseSidebar = ({
  onOpenPlaceDetail,
  places,
  selectedPlaceId,
}: {
  onOpenPlaceDetail: (placeId: string) => void
  places: PlaceSummary[]
  selectedPlaceId: string | null
}) => {
  const { signOut } = useAuth()
  const openPlaceAdd = useAppShellStore((state) => state.openPlaceAdd)
  const placeListLoad = useAppShellStore((state) => state.placeListLoad)
  const retryPlaceList = useAppShellStore((state) => state.retryPlaceList)
  const handleSignOut = () => {
    if (!window.confirm(LOGOUT_CONFIRM_MESSAGE)) {
      return
    }
    void signOut()
  }

  return (
    <>
      <DesktopBrowseTopBar onOpenPlaceAdd={openPlaceAdd} />

      <div className="-mx-6 flex-1 overflow-auto">
        <PlaceListPanel
          onRetry={retryPlaceList}
          onSelect={onOpenPlaceDetail}
          places={placeListLoad === 'ready' ? places : []}
          selectedPlaceId={selectedPlaceId}
          status={placeListLoad}
        />
      </div>

      <div className="relative -mx-6 -mb-6 h-9 shrink-0 overflow-hidden bg-white" data-testid="desktop-browse-footer">
        <button
          className="absolute inset-y-0 left-6 inline-flex cursor-pointer items-center text-xs font-medium text-[#7a7a7a] transition-colors hover:text-[#e52e30]"
          onClick={handleSignOut}
          type="button"
        >
          로그아웃
        </button>
      </div>
    </>
  )
}

const DesktopDetailSidebar = ({
  onBack,
  place,
  status,
}: {
  onBack: () => void
  place: PlaceSummary | undefined
  status: PlaceDetailLoadState
}) => (
  <section className="flex h-full flex-col" data-testid="desktop-detail-panel">
    <DetailHeader ariaLabel="목록으로 돌아가기" onBack={onBack} title="장소 상세" />
    <div className="flex-1 overflow-auto">
      <DetailBody onRetry={useAppShellStore.getState().retryPlaceDetail} place={place} status={status} />
    </div>
  </section>
)

const DesktopSidebar = ({
  navigationState,
  onOpenPlaceDetail,
  onReturnToMapBrowse,
  places,
  selectedPlace,
  selectedPlaceId,
}: {
  navigationState: NavigationState
  onOpenPlaceDetail: (placeId: string) => void
  onReturnToMapBrowse: () => void
  places: PlaceSummary[]
  selectedPlace: PlaceSummary | undefined
  selectedPlaceId: string | null
}) => {
  const closePlaceAdd = useAppShellStore((state) => state.closePlaceAdd)
  const placeDetailLoad = useAppShellStore((state) => state.placeDetailLoad)
  const sidebarClassName = `place-add-surface flex h-screen w-[390px] flex-col border-r border-[#ececf3] bg-[#fff] ${
    navigationState === 'place_detail_open' || navigationState === 'place_add_open' ? '' : 'px-5 py-5 md:px-6 md:py-6'
  }`

  return (
    <aside className={sidebarClassName} data-testid="desktop-sidebar">
      {navigationState === 'place_add_open' ? (
        <DesktopPlaceAddPanel onClose={closePlaceAdd} />
      ) : navigationState === 'place_detail_open' ? (
        <DesktopDetailSidebar onBack={onReturnToMapBrowse} place={selectedPlace} status={placeDetailLoad} />
      ) : (
        <DesktopBrowseSidebar onOpenPlaceDetail={onOpenPlaceDetail} places={places} selectedPlaceId={selectedPlaceId} />
      )}
    </aside>
  )
}

const MobileFloatingActions = () => {
  const openMobilePlaceList = useAppShellStore((state) => state.openMobilePlaceList)
  const openPlaceAdd = useAppShellStore((state) => state.openPlaceAdd)

  return (
    <div className="absolute inset-x-4 bottom-6 z-10 flex gap-3" data-testid="mobile-floating-actions">
      <button className="btn flex-1 rounded-full border-none bg-white text-[#222127] shadow-[0_18px_40px_rgba(39,45,89,0.18)]" onClick={openMobilePlaceList} type="button">
        목록 보기
      </button>
      <button className="btn flex-1 rounded-full border-none bg-[#5862fb] text-white shadow-[0_18px_40px_rgba(88,98,251,0.32)]" onClick={openPlaceAdd} type="button">
        <PlusIcon className="mr-1 h-4 w-4" />
        장소 추가
      </button>
    </div>
  )
}

const MobileListPage = ({
  onOpenPlaceDetail,
  onReturnToMapBrowse,
  places,
  selectedPlaceId,
}: {
  onOpenPlaceDetail: (placeId: string) => void
  onReturnToMapBrowse: () => void
  places: PlaceSummary[]
  selectedPlaceId: string | null
}) => {
  const placeListLoad = useAppShellStore((state) => state.placeListLoad)
  const retryPlaceList = useAppShellStore((state) => state.retryPlaceList)

  return (
    <section className="absolute inset-0 z-20 flex min-h-screen flex-col bg-[#fcfbff]" data-testid="mobile-list-page">
      <div className="border-b border-[#efedf6] px-4 pb-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-4">
            <BrandBlock compact />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8e89a1]">Browse</p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#222127]">오늘 둘러볼 장소</h2>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm rounded-full text-[#5f5b6a]" onClick={onReturnToMapBrowse} type="button">
            지도 보기
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-4 py-5">
        <PlaceListPanel
          onRetry={retryPlaceList}
          onSelect={onOpenPlaceDetail}
          places={placeListLoad === 'ready' ? places : []}
          selectedPlaceId={selectedPlaceId}
          status={placeListLoad}
        />
      </div>
    </section>
  )
}

const MobileDetailPage = ({
  onBack,
  place,
  status,
}: {
  onBack: () => void
  place: PlaceSummary | undefined
  status: PlaceDetailLoadState
}) => (
  <section className="absolute inset-0 z-30 flex min-h-screen flex-col bg-white" data-testid="mobile-detail-page">
    <DetailHeader ariaLabel="뒤로 가기" onBack={onBack} title="장소 상세" />
    <div className="flex-1 overflow-auto">
      <DetailBody onRetry={useAppShellStore.getState().retryPlaceDetail} place={place} status={status} />
    </div>
  </section>
)

const DesktopAppShell = ({
  navigationState,
  mapPlaces,
  onOpenPlaceDetail,
  onReturnToMapBrowse,
  selectedPlace,
}: {
  navigationState: NavigationState
  mapPlaces: PlaceSummary[]
  onOpenPlaceDetail: (placeId: string) => void
  onReturnToMapBrowse: () => void
  selectedPlace: PlaceSummary | undefined
}) => {
  const selectedPlaceId = useAppShellStore((state) => state.selectedPlaceId)
  const mapLevel = useAppShellStore((state) => state.mapLevel)
  const setMapLevel = useAppShellStore((state) => state.setMapLevel)

  return (
    <main className="hidden md:flex" data-testid="desktop-shell">
      <DesktopSidebar
        navigationState={navigationState}
        onOpenPlaceDetail={onOpenPlaceDetail}
        onReturnToMapBrowse={onReturnToMapBrowse}
        places={mapPlaces}
        selectedPlace={selectedPlace}
        selectedPlaceId={selectedPlaceId}
      />
      <section className="relative isolate flex-1 min-h-screen bg-[#f7f6fb]">
        <MapPane
          mapLevel={mapLevel}
          onMapLevelChange={setMapLevel}
          onMarkerSelect={onOpenPlaceDetail}
          places={mapPlaces}
          selectedPlaceId={selectedPlaceId}
        />
      </section>
    </main>
  )
}

const MobileAppShell = ({
  navigationState,
  mapPlaces,
  onOpenPlaceDetail,
  onReturnToMapBrowse,
  selectedPlace,
}: {
  navigationState: NavigationState
  mapPlaces: PlaceSummary[]
  onOpenPlaceDetail: (placeId: string) => void
  onReturnToMapBrowse: () => void
  selectedPlace: PlaceSummary | undefined
}) => {
  const closePlaceAdd = useAppShellStore((state) => state.closePlaceAdd)
  const selectedPlaceId = useAppShellStore((state) => state.selectedPlaceId)
  const placeDetailLoad = useAppShellStore((state) => state.placeDetailLoad)
  const mapLevel = useAppShellStore((state) => state.mapLevel)
  const setMapLevel = useAppShellStore((state) => state.setMapLevel)

  return (
    <main className="relative min-h-screen overflow-hidden bg-base-100 md:hidden" data-testid="mobile-shell">
      <MapPane
        mapLevel={mapLevel}
        onMapLevelChange={setMapLevel}
        onMarkerSelect={onOpenPlaceDetail}
        places={mapPlaces}
        selectedPlaceId={selectedPlaceId}
      />
      {navigationState === 'mobile_place_list_open' ? (
        <MobileListPage
          onOpenPlaceDetail={onOpenPlaceDetail}
          onReturnToMapBrowse={onReturnToMapBrowse}
          places={mapPlaces}
          selectedPlaceId={selectedPlaceId}
        />
      ) : null}
      {navigationState === 'place_detail_open' ? (
        <MobileDetailPage onBack={onReturnToMapBrowse} place={selectedPlace} status={placeDetailLoad} />
      ) : null}
      {navigationState === 'place_add_open' ? <MobilePlaceAddPage onClose={closePlaceAdd} /> : null}
      {navigationState === 'map_browse' ? <MobileFloatingActions /> : null}
    </main>
  )
}

const subscribeToLocation = (callback: () => void) => {
  window.addEventListener('popstate', callback)
  return () => {
    window.removeEventListener('popstate', callback)
  }
}

const getLocationPathname = () => window.location.pathname

export const NurimapAppShell = () => {
  const { isDesktop } = useViewportMode()
  const pathname = useSyncExternalStore(subscribeToLocation, getLocationPathname, getLocationPathname)
  const navigationState = useAppShellStore((state) => state.navigationState)
  const returnToMapBrowse = useAppShellStore((state) => state.returnToMapBrowse)
  const places = useAppShellStore((state) => state.places)
  const selectedPlaceId = useAppShellStore((state) => state.selectedPlaceId)
  const setSelectedPlaceId = useAppShellStore((state) => state.setSelectedPlaceId)
  const mapPlaces = places.filter(hasCoordinates)
  const routePlaceId = getPlaceIdFromPathname(pathname)
  const routeSelectedPlace = routePlaceId
    ? mapPlaces.find((place) => place.id === routePlaceId)
    : undefined
  const selectedPlace = routePlaceId
    ? routeSelectedPlace
    : mapPlaces.find((place) => place.id === selectedPlaceId)
  const effectiveNavigationState = routePlaceId ? 'place_detail_open' : navigationState

  useEffect(() => {
    if (!routePlaceId) {
      return
    }

    if (!routeSelectedPlace) {
      returnToMapBrowse()
      window.history.replaceState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }

    if (selectedPlaceId !== routePlaceId) {
      setSelectedPlaceId(routePlaceId)
    }
  }, [returnToMapBrowse, routePlaceId, routeSelectedPlace, selectedPlaceId, setSelectedPlaceId])

  const navigateToPath = (path: string, replace = false) => {
    if (window.location.pathname === path) {
      window.dispatchEvent(new PopStateEvent('popstate'))
      return
    }

    if (replace) {
      window.history.replaceState({}, '', path)
    } else {
      window.history.pushState({}, '', path)
    }

    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleOpenPlaceDetail = (placeId: string) => {
    returnToMapBrowse()
    setSelectedPlaceId(placeId)
    navigateToPath(getDetailRoutePath(placeId))
  }

  const handleReturnToMapBrowse = () => {
    returnToMapBrowse()
    navigateToPath('/', true)
  }

  return isDesktop ? (
    <DesktopAppShell
      navigationState={effectiveNavigationState}
      mapPlaces={mapPlaces}
      onOpenPlaceDetail={handleOpenPlaceDetail}
      onReturnToMapBrowse={handleReturnToMapBrowse}
      selectedPlace={selectedPlace}
    />
  ) : (
    <MobileAppShell
      navigationState={effectiveNavigationState}
      mapPlaces={mapPlaces}
      onOpenPlaceDetail={handleOpenPlaceDetail}
      onReturnToMapBrowse={handleReturnToMapBrowse}
      selectedPlace={selectedPlace}
    />
  )
}
