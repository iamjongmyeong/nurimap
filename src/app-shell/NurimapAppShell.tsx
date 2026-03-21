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
import type { PlaceSummary, PlaceType, ZeropayStatus } from './types'
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

const ZEROPAY_STATUS_LABEL: Record<ZeropayStatus, string> = {
  available: '제로페이 가능',
  unavailable: '제로페이 불가능',
  needs_verification: '제로페이 확인 필요',
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
const REVIEW_LIMIT = 500
const STAR_PATH =
  'M11.9995 19.3643L6.46613 22.6977C6.22168 22.8532 5.96613 22.9199 5.69946 22.8977C5.4328 22.8754 5.19946 22.7865 4.99946 22.631C4.79946 22.4754 4.64391 22.2812 4.5328 22.0483C4.42168 21.8154 4.39946 21.5541 4.46613 21.2643L5.9328 14.9643L1.0328 10.731C0.810573 10.531 0.671906 10.303 0.616795 10.047C0.561684 9.79099 0.578129 9.54121 0.666129 9.29766C0.754129 9.0541 0.887462 8.8541 1.06613 8.69766C1.2448 8.54121 1.48924 8.44121 1.79946 8.39766L8.26613 7.83099L10.7661 1.89766C10.8772 1.63099 11.0497 1.43099 11.2835 1.29766C11.5172 1.16432 11.7559 1.09766 11.9995 1.09766C12.243 1.09766 12.4817 1.16432 12.7155 1.29766C12.9492 1.43099 13.1217 1.63099 13.2328 1.89766L15.7328 7.83099L22.1995 8.39766C22.5106 8.4421 22.755 8.5421 22.9328 8.69766C23.1106 8.85321 23.2439 9.05321 23.3328 9.29766C23.4217 9.5421 23.4386 9.79232 23.3835 10.0483C23.3284 10.3043 23.1892 10.5319 22.9661 10.731L18.0661 14.9643L19.5328 21.2643C19.5995 21.5532 19.5772 21.8145 19.4661 22.0483C19.355 22.2821 19.1995 22.4763 18.9995 22.631C18.7995 22.7857 18.5661 22.8745 18.2995 22.8977C18.0328 22.9208 17.7772 22.8541 17.5328 22.6977L11.9995 19.3643Z'
const PRIMARY_BUTTON_CLASSES = 'inline-flex items-center justify-center rounded-full bg-[#5862fb] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4953f1] disabled:cursor-not-allowed disabled:opacity-50'
const SECONDARY_BUTTON_CLASSES = 'inline-flex items-center justify-center rounded-full border border-[#d9d8e6] bg-white px-4 py-3 text-sm font-semibold text-[#222127] transition hover:border-[#c8c7d7] hover:bg-[#fafaff] disabled:cursor-not-allowed disabled:opacity-50'
const ADD_RATING_TEXTAREA_CLASSES = 'min-h-[176px] w-full resize-none rounded-[24px] border border-[#ebe9f4] bg-[#fbfaff] px-5 py-4 text-base leading-7 text-[#1f1f1f] placeholder:text-[#b3afbf] focus:border-[#5862fb] focus:outline-none focus:ring-0 focus:shadow-none'

const clampReviewContent = (value: string) => Array.from(value).slice(0, REVIEW_LIMIT).join('')


const EmptyState = () => (
  <div className="rounded-[28px] border border-dashed border-[#d9d9e7] bg-white px-5 py-8 text-left shadow-[0_20px_60px_rgba(40,47,88,0.08)]">
    <p className="text-sm font-semibold text-[#222127]">아직 등록된 장소가 없어요</p>
    <p className="mt-2 text-sm leading-6 text-[#7e7b8b]">조건에 맞는 장소가 생기면 이 영역에 먼저 보여드릴게요.</p>
  </div>
)

const LoadingState = () => (
  <div className="flex items-center gap-3 rounded-[28px] bg-white px-5 py-6 shadow-[0_20px_60px_rgba(40,47,88,0.08)]" data-testid="place-list-loading">
    <span aria-hidden="true" className="ui-spinner ui-spinner-md text-[#5862fb]" />
    <div>
      <p className="text-sm font-semibold text-[#222127]">장소 목록을 불러오는 중이에요</p>
      <p className="text-sm text-[#7e7b8b]">잠시만 기다려 주세요.</p>
    </div>
  </div>
)

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="rounded-[28px] bg-white px-5 py-6 shadow-[0_20px_60px_rgba(40,47,88,0.08)]" data-testid="place-list-error">
    <p className="text-sm font-semibold text-[#e53935]">장소 목록을 불러오지 못했어요</p>
    <p className="mt-2 text-sm text-[#7e7b8b]">기본 에러 상태는 유지하고, 재시도만 제공해요.</p>
    <button className={`${SECONDARY_BUTTON_CLASSES} mt-4`} onClick={onRetry} type="button">
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
    alt="제로페이 상태"
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
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-[#7d7a88]">Local lunch radar</p>
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
    <span aria-hidden="true" className="ui-spinner ui-spinner-md text-[#5862fb]" />
    <div>
      <p className="text-sm font-semibold text-[#222127]">상세 정보를 불러오는 중이에요</p>
      <p className="text-sm text-[#7e7b8b]">기본 로딩 상태를 그대로 유지합니다.</p>
    </div>
  </div>
)

const DetailErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="mt-6 rounded-[28px] bg-[#f6f6fb] p-5" data-testid="place-detail-error">
    <p className="text-sm font-semibold text-[#e53935]">상세 정보를 불러오지 못했어요</p>
    <p className="mt-2 text-sm text-[#7e7b8b]">상세 화면에서 바로 재시도할 수 있어요.</p>
    <button className={`${SECONDARY_BUTTON_CLASSES} mt-4`} onClick={onRetry} type="button">
      다시 시도
    </button>
  </div>
)

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

            <DetailMetaRow icon={<ZeroPayIndicator />} testId="detail-zeropay-row">
              <span>{ZEROPAY_STATUS_LABEL[place.zeropay_status]}</span>
            </DetailMetaRow>

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
}: {
  ariaLabel: string
  onBack: () => void
  title: string
}) => (
  <div className="sticky top-0 z-10 h-14 bg-white" data-testid="detail-header">
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

const DetailFooterCta = ({ onClick }: { onClick: () => void }) => (
  <div className="border-t border-[#f0eff6] bg-white px-4 pb-5 pt-4">
    <button
      className={`${PRIMARY_BUTTON_CLASSES} h-12 w-full text-base`}
      data-testid="detail-review-cta"
      onClick={onClick}
      type="button"
    >
      평가 남기기
    </button>
  </div>
)

const DetailOverviewScreen = ({
  backLabel,
  onBack,
  onOpenAddRating,
  onRetry,
  place,
  status,
}: {
  backLabel: string
  onBack: () => void
  onOpenAddRating: () => void
  onRetry: () => void
  place: PlaceSummary | undefined
  status: PlaceDetailLoadState
}) => (
  <div className="flex h-full flex-col bg-white">
    <DetailHeader ariaLabel={backLabel} onBack={onBack} title="장소 상세" />
    <div className="flex-1 overflow-auto">
      <DetailBody onRetry={onRetry} place={place} status={status} />
    </div>
    {status === 'ready' && place && !place.my_review ? <DetailFooterCta onClick={onOpenAddRating} /> : null}
  </div>
)

const AddRatingStars = ({
  rating,
  onChange,
}: {
  rating: number
  onChange: (value: number) => void
}) => (
  <div className="flex gap-2" data-testid="detail-add-rating-rating-field">
    {[1, 2, 3, 4, 5].map((value) => {
      const active = value <= rating
      return (
        <button
          aria-label={`${value}점`}
          className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition ${
            active
              ? 'border-[#ffd6d4] bg-[#fff1f0] text-[#e53935]'
              : 'border-[#eceaf4] bg-white text-[#c7c5d3] hover:border-[#d8d5e7] hover:text-[#9d99ab]'
          }`}
          data-testid={`review-add-rating-star-${value}`}
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d={STAR_PATH} fill="currentColor" />
          </svg>
        </button>
      )
    })}
  </div>
)

const AddRatingScreen = ({
  onBack,
  onSubmit,
  place,
}: {
  onBack: () => void
  onSubmit: (placeId: string, draft: ReviewDraft) => { status: 'saved' | 'existing_review' | 'error'; message?: string }
  place: PlaceSummary | undefined
}) => {
  const [draft, setDraft] = useState(createInitialReviewDraft)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hasReviewContent = draft.review_content.trim() !== ''

  const handleSubmit = async () => {
    if (!place || submitState === 'submitting') {
      return
    }

    const validationError = validateReviewDraft(draft)
    if (validationError) {
      setSubmitState('error')
      setErrorMessage(validationError)
      return
    }

    setSubmitState('submitting')
    setErrorMessage(null)
    await new Promise((resolve) => setTimeout(resolve, 50))

    const result = onSubmit(place.id, draft)
    if (result.status !== 'saved') {
      setSubmitState('error')
      setErrorMessage(result.message ?? '평가를 저장하지 못했어요. 다시 시도해 주세요.')
      return
    }

    setSubmitState('idle')
  }

  return (
    <div className="flex h-full flex-col bg-[#fcfbff]" data-testid="mobile-review-add-page">
      <DetailHeader ariaLabel="뒤로 가기" onBack={onBack} title="평가 남기기" />
      <div className="flex-1 overflow-auto px-4 pb-6 pt-5">
        <div className="mx-auto flex w-full max-w-[420px] flex-col gap-5" data-testid="review-add-surface">
          {place ? (
            <>
              <section className="rounded-[32px] bg-white p-5 shadow-[0_24px_64px_rgba(40,47,88,0.08)]" data-testid="detail-add-rating-place-card">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8e89a1]">Add rating</p>
                <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.03em] text-[#222127]">{place.name}</h2>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#7a7687]">
                  <span className="inline-flex items-center gap-1">
                    <PlaceTypeIcon className="h-4 w-4" emphasized placeType={place.place_type} />
                    {PLACE_TYPE_LABEL[place.place_type]}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MetaReviewStarIcon className="h-4 w-4 text-[#ff6b6b]" />
                    현재 {place.average_rating.toFixed(1)} · {place.review_count}개 평가
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#6f6b7b]">별점과 후기를 남기면 상세 화면에서 바로 확인할 수 있어요.</p>
              </section>

              <section className="rounded-[32px] bg-white p-5 shadow-[0_24px_64px_rgba(40,47,88,0.08)]" data-testid="review-add-form">
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-[#1f1f1f]">이번 장소는 어떠셨나요?</p>
                    <p className="mt-2 text-sm leading-6 text-[#7a7687]">별점 1점부터 5점까지 선택할 수 있어요.</p>
                    <div className="mt-4">
                      <AddRatingStars rating={draft.rating_score} onChange={(rating_score) => setDraft((current) => ({ ...current, rating_score }))} />
                    </div>
                  </div>

                  <div
                    className={`rounded-[28px] border p-4 transition ${
                      hasReviewContent
                        ? 'border-[#d9d6ff] bg-[#f7f6ff]'
                        : 'border-[#e8e7f1] bg-[#fcfcfe]'
                    }`}
                    data-review-state={hasReviewContent ? 'filled' : 'empty'}
                    data-testid="detail-add-rating-review-field"
                  >
                    <label className="block text-sm font-semibold text-[#1f1f1f]" htmlFor="detail-add-rating-review-input">
                      후기(선택)
                    </label>
                    <textarea
                      className={`${ADD_RATING_TEXTAREA_CLASSES} mt-3 min-h-[184px] border-0 bg-transparent px-0 py-0`}
                      data-testid="review-add-content-input"
                      id="review-add-content-input"
                      maxLength={REVIEW_LIMIT}
                      onChange={(event) => setDraft((current) => ({ ...current, review_content: clampReviewContent(event.target.value) }))}
                      placeholder="메뉴, 분위기, 다시 가고 싶은 이유를 자유롭게 남겨주세요."
                      value={draft.review_content}
                    />
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium text-[#7a7687]">
                      <span>{hasReviewContent ? '입력한 후기는 저장 후 바로 상세에 보여요.' : '후기는 비워 둬도 괜찮아요.'}</span>
                      <span data-testid="detail-add-rating-review-count">{draft.review_content.length} / 500</span>
                    </div>
                  </div>

                  {errorMessage ? (
                    <p className="text-sm text-[#d92d20]" data-testid="detail-add-rating-error">{errorMessage}</p>
                  ) : null}
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#dbdbe6] bg-white p-5 shadow-[0_18px_48px_rgba(40,47,88,0.06)]">
              <p className="text-sm font-medium text-[#222127]">평가할 장소를 찾지 못했어요</p>
              <p className="mt-2 text-sm leading-6 text-[#7e7b8b]">상세 화면으로 돌아가 다시 시도해 주세요.</p>
            </div>
          )}
        </div>
      </div>

      {place ? (
        <div className="border-t border-[#f0eff6] bg-white/95 px-4 pb-5 pt-4 backdrop-blur">
          <div className="mx-auto w-full max-w-[420px]">
            <button
              className={`${PRIMARY_BUTTON_CLASSES} h-12 w-full gap-2 text-base`}
              data-testid="review-add-submit-button"
              disabled={submitState === 'submitting'}
              onClick={() => {
                void handleSubmit()
              }}
              type="button"
            >
              {submitState === 'submitting' ? (
                <span aria-hidden="true" className="ui-spinner ui-spinner-sm" data-testid="review-add-submit-spinner" />
              ) : null}
              <span>{submitState === 'submitting' ? '저장 중' : '평가 남기기'}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

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
  onBrowseBack,
  place,
  status,
}: {
  onBrowseBack: () => void
  place: PlaceSummary | undefined
  status: PlaceDetailLoadState
}) => (
  <section className="flex h-full flex-col" data-testid="desktop-detail-panel">
    <DetailHeader ariaLabel="목록으로 돌아가기" onBack={onBrowseBack} title="장소 상세" />
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
        <DesktopDetailSidebar
          onBrowseBack={onReturnToMapBrowse}
          place={selectedPlace}
          status={placeDetailLoad}
        />
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
      <button className="flex-1 rounded-full bg-white px-4 py-3 text-[#222127] shadow-[0_18px_40px_rgba(39,45,89,0.18)]" onClick={openMobilePlaceList} type="button">
        목록 보기
      </button>
      <button className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#5862fb] px-4 py-3 text-white shadow-[0_18px_40px_rgba(88,98,251,0.32)]" onClick={openPlaceAdd} type="button">
        <PlusIcon className="h-4 w-4" />
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
          <button className="inline-flex h-9 items-center justify-center rounded-full px-3 text-[#5f5b6a]" onClick={onReturnToMapBrowse} type="button">
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
  backLabel,
  detailChildSurface,
  onAddRatingBack,
  onBrowseBack,
  onOpenAddRating,
  onSubmitReview,
  place,
  status,
}: {
  backLabel: string
  detailChildSurface: 'detail' | 'add_rating'
  onAddRatingBack: () => void
  onBrowseBack: () => void
  onOpenAddRating: () => void
  onSubmitReview: (placeId: string, draft: ReviewDraft) => { status: 'saved' | 'existing_review' | 'error'; message?: string }
  place: PlaceSummary | undefined
  status: PlaceDetailLoadState
}) => {
  if (detailChildSurface === 'add_rating') {
    return (
      <section className="absolute inset-0 z-30 flex min-h-screen flex-col bg-white">
        <AddRatingScreen key={place?.id ?? 'missing-place'} onBack={onAddRatingBack} onSubmit={onSubmitReview} place={place} />
      </section>
    )
  }

  return (
    <section className="absolute inset-0 z-30 flex min-h-screen flex-col bg-white" data-testid="mobile-detail-page">
      <DetailOverviewScreen
        backLabel={backLabel}
        onBack={onBrowseBack}
        onOpenAddRating={onOpenAddRating}
        onRetry={useAppShellStore.getState().retryPlaceDetail}
        place={place}
        status={status}
      />
    </section>
  )
}

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
  detailChildSurface,
  navigationState,
  mapPlaces,
  onAddRatingBack,
  onOpenAddRating,
  onOpenPlaceDetail,
  onReturnToMapBrowse,
  onSubmitReview,
  selectedPlace,
}: {
  detailChildSurface: 'detail' | 'add_rating'
  navigationState: NavigationState
  mapPlaces: PlaceSummary[]
  onAddRatingBack: () => void
  onOpenAddRating: () => void
  onOpenPlaceDetail: (placeId: string) => void
  onReturnToMapBrowse: () => void
  onSubmitReview: (placeId: string, draft: ReviewDraft) => { status: 'saved' | 'existing_review' | 'error'; message?: string }
  selectedPlace: PlaceSummary | undefined
}) => {
  const closePlaceAdd = useAppShellStore((state) => state.closePlaceAdd)
  const selectedPlaceId = useAppShellStore((state) => state.selectedPlaceId)
  const placeDetailLoad = useAppShellStore((state) => state.placeDetailLoad)
  const mapLevel = useAppShellStore((state) => state.mapLevel)
  const setMapLevel = useAppShellStore((state) => state.setMapLevel)

  return (
    <main className="relative min-h-screen overflow-hidden bg-white md:hidden" data-testid="mobile-shell">
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
        <MobileDetailPage
          backLabel="뒤로 가기"
          detailChildSurface={detailChildSurface}
          onAddRatingBack={onAddRatingBack}
          onBrowseBack={onReturnToMapBrowse}
          onOpenAddRating={onOpenAddRating}
          onSubmitReview={onSubmitReview}
          place={selectedPlace}
          status={placeDetailLoad}
        />
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

const readDetailChildSurfaceFromHistoryState = (state: unknown): 'detail' | 'add_rating' => {
  if (!state || typeof state !== 'object') {
    return 'detail'
  }

  return 'detailChildSurface' in state && state.detailChildSurface === 'add_rating'
    ? 'add_rating'
    : 'detail'
}

export const NurimapAppShell = () => {
  const { isDesktop } = useViewportMode()
  const pathname = useSyncExternalStore(subscribeToLocation, getLocationPathname, getLocationPathname)
  const navigationState = useAppShellStore((state) => state.navigationState)
  const detailChildSurface = useAppShellStore((state) => state.detailChildSurface)
  const openPlaceDetail = useAppShellStore((state) => state.openPlaceDetail)
  const openDetailAddRating = useAppShellStore((state) => state.openDetailAddRating)
  const closeDetailAddRating = useAppShellStore((state) => state.closeDetailAddRating)
  const syncDetailChildSurface = useAppShellStore((state) => state.syncDetailChildSurface)
  const returnToMapBrowse = useAppShellStore((state) => state.returnToMapBrowse)
  const places = useAppShellStore((state) => state.places)
  const selectedPlaceId = useAppShellStore((state) => state.selectedPlaceId)
  const setSelectedPlaceId = useAppShellStore((state) => state.setSelectedPlaceId)
  const submitPlaceReview = useAppShellStore((state) => state.submitPlaceReview)
  const mapLevel = useAppShellStore((state) => state.mapLevel)
  const setMapLevel = useAppShellStore((state) => state.setMapLevel)
  const mapPlaces = places.filter(hasCoordinates)
  const routePlaceId = getPlaceIdFromPathname(pathname)
  const routeSelectedPlace = routePlaceId
    ? mapPlaces.find((place) => place.id === routePlaceId)
    : undefined
  const selectedPlace = routePlaceId
    ? routeSelectedPlace
    : mapPlaces.find((place) => place.id === selectedPlaceId)
  const effectiveNavigationState = routePlaceId ? 'place_detail_open' : navigationState
  const effectiveDetailChildSurface = routePlaceId ? detailChildSurface : 'detail'

  useEffect(() => {
    const nextSurface = routePlaceId
      ? readDetailChildSurfaceFromHistoryState(window.history.state)
      : 'detail'

    if (detailChildSurface !== nextSurface) {
      syncDetailChildSurface(nextSurface)
    }
  }, [detailChildSurface, routePlaceId, syncDetailChildSurface])

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith(DETAIL_ROUTE_PREFIX)) {
        syncDetailChildSurface(readDetailChildSurfaceFromHistoryState(window.history.state))
        return
      }

      returnToMapBrowse()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [returnToMapBrowse, syncDetailChildSurface])

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

    if (mapLevel !== 2) {
      setMapLevel(2)
    }
  }, [mapLevel, returnToMapBrowse, routePlaceId, routeSelectedPlace, selectedPlaceId, setMapLevel, setSelectedPlaceId])

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
    openPlaceDetail(placeId)
    setMapLevel(2)
    navigateToPath(getDetailRoutePath(placeId))
  }

  const handleReturnToMapBrowse = () => {
    returnToMapBrowse()
    navigateToPath('/', true)
  }

  const handleOpenAddRating = () => {
    const targetPlaceId = routePlaceId ?? selectedPlace?.id ?? selectedPlaceId
    if (!targetPlaceId) {
      return
    }

    const targetPath = getDetailRoutePath(targetPlaceId)
    const currentState = window.history.state && typeof window.history.state === 'object'
      ? window.history.state as Record<string, unknown>
      : {}

    if (window.location.pathname !== targetPath) {
      window.history.replaceState({ ...currentState, detailChildSurface: 'detail' }, '', targetPath)
    }

    window.history.pushState({ ...currentState, detailChildSurface: 'add_rating' }, '', targetPath)
    openDetailAddRating()
  }

  const handleCloseAddRating = () => {
    const currentState = window.history.state && typeof window.history.state === 'object'
      ? window.history.state as Record<string, unknown>
      : {}

    window.history.replaceState({ ...currentState, detailChildSurface: 'detail' }, '', window.location.pathname)
    closeDetailAddRating()
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleSubmitReview = (placeId: string, draft: ReviewDraft) => {
    const result = submitPlaceReview(placeId, draft)

    if (result.status === 'saved') {
      handleCloseAddRating()
    }

    return result
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
      detailChildSurface={effectiveDetailChildSurface}
      navigationState={effectiveNavigationState}
      mapPlaces={mapPlaces}
      onAddRatingBack={handleCloseAddRating}
      onOpenAddRating={handleOpenAddRating}
      onOpenPlaceDetail={handleOpenPlaceDetail}
      onReturnToMapBrowse={handleReturnToMapBrowse}
      onSubmitReview={handleSubmitReview}
      selectedPlace={selectedPlace}
    />
  )
}
