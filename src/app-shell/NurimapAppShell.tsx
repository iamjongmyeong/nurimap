import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
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
import { useKakaoScript } from './useKakaoScript'
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
const MOBILE_BOTTOM_TAB_MAP_ICON = {
  active: '/assets/icons/icon-bottom-tab-map-black.svg',
  inactive: '/assets/icons/icon-bottom-tab-map-gray.svg',
}
const MOBILE_BOTTOM_TAB_LIST_ICON = {
  active: '/assets/icons/icon-bottom-tab-list-black.svg',
  inactive: '/assets/icons/icon-bottom-tab-list-gray.svg',
}
const MOBILE_BOTTOM_TAB_PLUS_ICON = {
  active: '/assets/icons/icon-bottom-tab-plus-black.svg',
  inactive: '/assets/icons/icon-bottom-tab-plus-gray.svg',
}
const LOGOUT_CONFIRM_MESSAGE = '로그아웃하시겠어요?'
const ZEROPAY_TOOLTIP_DELAY_MS = 400
const DETAIL_ROUTE_PREFIX = '/places/'
const REVIEW_LIMIT = 500
const ADD_RATING_TEXTAREA_MIN_HEIGHT = 88
const BROWSE_BOOTSTRAP_LOADING_TITLE = '데이터를 불러오는 중이에요.'
const BROWSE_BOOTSTRAP_LOADING_BODY = '잠시만 기다려 주세요.'
const BROWSE_BOOTSTRAP_ERROR_TITLE = '데이터를 불러오지 못했어요.'
const BROWSE_BOOTSTRAP_ERROR_BODY = '네트워크 상태를 확인한 뒤 다시 시도해주세요.'
const BROWSE_BOOTSTRAP_RETRY_LABEL = '다시 시도'
const STAR_PATH =
  'M11.9995 19.3643L6.46613 22.6977C6.22168 22.8532 5.96613 22.9199 5.69946 22.8977C5.4328 22.8754 5.19946 22.7865 4.99946 22.631C4.79946 22.4754 4.64391 22.2812 4.5328 22.0483C4.42168 21.8154 4.39946 21.5541 4.46613 21.2643L5.9328 14.9643L1.0328 10.731C0.810573 10.531 0.671906 10.303 0.616795 10.047C0.561684 9.79099 0.578129 9.54121 0.666129 9.29766C0.754129 9.0541 0.887462 8.8541 1.06613 8.69766C1.2448 8.54121 1.48924 8.44121 1.79946 8.39766L8.26613 7.83099L10.7661 1.89766C10.8772 1.63099 11.0497 1.43099 11.2835 1.29766C11.5172 1.16432 11.7559 1.09766 11.9995 1.09766C12.243 1.09766 12.4817 1.16432 12.7155 1.29766C12.9492 1.43099 13.1217 1.63099 13.2328 1.89766L15.7328 7.83099L22.1995 8.39766C22.5106 8.4421 22.755 8.5421 22.9328 8.69766C23.1106 8.85321 23.2439 9.05321 23.3328 9.29766C23.4217 9.5421 23.4386 9.79232 23.3835 10.0483C23.3284 10.3043 23.1892 10.5319 22.9661 10.731L18.0661 14.9643L19.5328 21.2643C19.5995 21.5532 19.5772 21.8145 19.4661 22.0483C19.355 22.2821 19.1995 22.4763 18.9995 22.631C18.7995 22.7857 18.5661 22.8745 18.2995 22.8977C18.0328 22.9208 17.7772 22.8541 17.5328 22.6977L11.9995 19.3643Z'
const SECONDARY_BUTTON_CLASSES = 'inline-flex items-center justify-center rounded-full border border-[#d9d8e6] bg-white px-4 py-3 text-sm font-semibold text-[#222127] transition hover:border-[#c8c7d7] hover:bg-[#fafaff] disabled:cursor-not-allowed disabled:opacity-50'
const MOBILE_SHELL_CLASS = 'relative h-[100dvh] min-h-[100dvh] overflow-hidden bg-white md:hidden'
const MOBILE_SURFACE_CLASS = 'absolute inset-0 flex h-full min-h-0 flex-col bg-white overflow-hidden'
const MOBILE_SCROLL_REGION_CLASS = 'flex-1 overflow-y-auto overscroll-contain'
const MOBILE_SHELL_STYLE: CSSProperties = {
  height: 'var(--nurimap-viewport-height, 100dvh)',
  minHeight: 'var(--nurimap-viewport-height, 100dvh)',
}
const MOBILE_SAFE_AREA_TOP_STYLE: CSSProperties = {
  paddingTop: 'var(--nurimap-effective-top-inset, 0px)',
}
const MOBILE_SAFE_AREA_BOTTOM_STYLE: CSSProperties = {
  paddingBottom: 'var(--nurimap-effective-bottom-inset, 0px)',
}
const MOBILE_BOTTOM_BAR_SPACER_STYLE: CSSProperties = {
  paddingBottom: 'calc(56px + var(--nurimap-effective-bottom-inset, 0px))',
}
const clampReviewContent = (value: string) => Array.from(value).slice(0, REVIEW_LIMIT).join('')

const resizeAddRatingTextarea = (textarea: HTMLTextAreaElement) => {
  textarea.style.height = `${ADD_RATING_TEXTAREA_MIN_HEIGHT}px`
  textarea.style.height = `${Math.max(textarea.scrollHeight, ADD_RATING_TEXTAREA_MIN_HEIGHT)}px`
}

const BrowseBootstrapState = ({
  mode,
  onRetry,
}: {
  mode: 'error' | 'loading'
  onRetry?: () => void
}) => (
  <div
    className="flex h-full min-h-0 w-full items-center justify-center bg-[#f7f6fb] px-6 py-10"
    data-testid={mode === 'loading' ? 'browse-bootstrap-loading' : 'browse-bootstrap-error'}
  >
    <div className="w-full max-w-sm rounded-[32px] bg-white px-6 py-7 text-center shadow-[0_24px_72px_rgba(15,23,42,0.12)]">
      {mode === 'loading' ? (
        <>
          <div className="flex justify-center">
            <span aria-hidden="true" className="ui-spinner ui-spinner-lg text-[#5862fb]" />
          </div>
          <p className="mt-4 text-base font-semibold text-slate-800">{BROWSE_BOOTSTRAP_LOADING_TITLE}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{BROWSE_BOOTSTRAP_LOADING_BODY}</p>
        </>
      ) : (
        <>
          <p className="text-base font-semibold text-slate-800">{BROWSE_BOOTSTRAP_ERROR_TITLE}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{BROWSE_BOOTSTRAP_ERROR_BODY}</p>
          <button
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#5862fb] px-6 text-sm font-semibold text-white transition hover:bg-[#4953f1]"
            onClick={onRetry}
            type="button"
          >
            {BROWSE_BOOTSTRAP_RETRY_LABEL}
          </button>
        </>
      )}
    </div>
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

const MobileBottomTabIcon = ({
  className = 'h-5 w-5',
  src,
  testId,
}: {
  className?: string
  src: string
  testId?: string
}) => (
  <img alt="" aria-hidden="true" className={className} data-testid={testId} src={src} />
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

const LogoutIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M14 7L19 12L14 17M19 12H10M10 4H7C5.89543 4 5 4.89543 5 6V18C5 19.1046 5.89543 20 7 20H10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
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
      className={`flex h-24 w-full cursor-pointer flex-col items-start justify-center gap-4 bg-white px-6 py-5 text-left transition-colors ${
        selected ? 'bg-[#f7f8ff]' : ''
      }`}
      data-testid={`place-list-item-${place.id}`}
      onClick={() => onSelect(place.id)}
      type="button"
    >
      <div className="flex w-full items-center gap-1">
        <p className="min-w-0 flex-1 truncate text-base font-medium leading-6 text-[#1f1f1f]">{place.name}</p>
        {place.zeropay_status === 'available' ? (
          <ListZeroPayIcon placeId={place.id} />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
    </button>
    {showDivider ? <div aria-hidden="true" className="mx-6 my-1 border-b border-[#f0f0f0]" /> : null}
  </div>
)

const PlaceListPanel = ({
  places,
  selectedPlaceId,
  status,
  onSelect,
}: {
  places: PlaceSummary[]
  selectedPlaceId: string | null
  status: PlaceListLoadState
  onSelect: (placeId: string) => void
}) => {
  if (status !== 'ready') {
    return null
  }

  if (places.length === 0) {
    return null
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

const DetailErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="mt-6 rounded-[28px] bg-[#f6f6fb] p-5" data-testid="place-detail-error">
    <p className="text-sm font-semibold text-[#e53935]">장소 정보를 불러오지 못했어요.</p>
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
      <p className="whitespace-pre-line text-sm leading-6 text-[#1f1f1f]" data-testid={`detail-review-content-${review.id}`}>
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
  if (status === 'error') {
    return <DetailErrorState onRetry={onRetry} />
  }

  if (!place) {
    return (
      <div className="mt-6 rounded-[28px] border border-dashed border-[#dbdbe6] bg-white p-5">
        <p className="text-sm font-medium text-[#222127]">오류가 발생했어요 🥲</p>
        <p className="mt-2 text-sm leading-6 text-[#7e7b8b]">새로고침하거나 다른 장소를 선택해주세요.</p>
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
  <div className="sticky top-0 z-10 shrink-0 bg-white" data-testid="detail-header" style={MOBILE_SAFE_AREA_TOP_STYLE}>
    <div className="relative h-14">
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
  <div className="flex items-center justify-center bg-white px-6 pb-6 pt-0" data-testid="detail-review-cta-container">
    <button
      className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-[10px] rounded-[12px] bg-[#5862fb] px-0 py-2 text-sm font-semibold text-white transition hover:bg-[#4953f1] disabled:cursor-not-allowed disabled:opacity-50"
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
  <div className="flex h-full min-h-0 flex-col bg-white">
    <DetailHeader ariaLabel={backLabel} onBack={onBack} title="장소 상세" />
    <div className={MOBILE_SCROLL_REGION_CLASS} data-testid="detail-scroll-region">
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
  <div className="flex items-center gap-[6px]" data-testid="detail-add-rating-rating-field">
    {[1, 2, 3, 4, 5].map((value) => {
      const active = value <= rating
      return (
        <button
          aria-label={`${value}점`}
          className={`inline-flex h-6 w-6 cursor-pointer items-center justify-center transition ${
            active ? 'text-[#e53935]' : 'text-[#c7c5d3] hover:text-[#9d99ab]'
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
  onSubmit: (placeId: string, draft: ReviewDraft) => Promise<{ status: 'saved' | 'existing_review' | 'error'; message?: string }>
  place: PlaceSummary | undefined
}) => {
  const [draft, setDraft] = useState(createInitialReviewDraft)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const reviewTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!reviewTextareaRef.current) return
    resizeAddRatingTextarea(reviewTextareaRef.current)
  }, [draft.review_content])

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

    const result = await onSubmit(place.id, draft)
    if (result.status !== 'saved') {
      setSubmitState('error')
      setErrorMessage(result.message ?? '평가를 저장하지 못했어요. 다시 시도해 주세요.')
      return
    }

    setSubmitState('idle')
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="mobile-review-add-page">
      <DetailHeader ariaLabel="뒤로 가기" onBack={onBack} title="평가 남기기" />
      <div className={`${MOBILE_SCROLL_REGION_CLASS} px-6 pb-6 pt-6`} data-testid="detail-add-rating-scroll-region">
        <div className="mx-auto flex w-full flex-col" data-testid="review-add-surface">
          {place ? (
            <>
              <section className="flex w-full flex-col items-start gap-6" data-testid="review-add-form">
                <div>
                  <p className="font-['Pretendard'] text-[12px] font-medium leading-[18px] tracking-[-0.3px] text-[#1c1c1c]">평가</p>
                  <div className="mt-2">
                    <AddRatingStars rating={draft.rating_score} onChange={(rating_score) => setDraft((current) => ({ ...current, rating_score }))} />
                  </div>
                </div>

                <div className="flex min-h-[114px] w-full flex-col gap-2" data-testid="detail-add-rating-review-field">
                  <label className="block font-['Pretendard'] text-[12px] font-medium leading-[18px] tracking-[-0.3px] text-[#1c1c1c]" htmlFor="detail-add-rating-review-input">
                    후기(선택)
                  </label>
                  <textarea
                    className="h-[88px] min-h-[88px] w-full resize-none overflow-hidden rounded-xl border border-[#ebe7f1] bg-white px-3 py-2 text-sm leading-6 text-[#1f1f1f] placeholder:text-[#b3afbf] focus:border-[#5862fb] focus:outline-none focus:ring-0 focus:shadow-none"
                    data-testid="review-add-content-input"
                    id="review-add-content-input"
                    maxLength={REVIEW_LIMIT}
                    onChange={(event) => {
                      const nextReviewContent = clampReviewContent(event.target.value)
                      event.currentTarget.value = nextReviewContent
                      setDraft((current) => ({ ...current, review_content: nextReviewContent }))
                      resizeAddRatingTextarea(event.currentTarget)
                    }}
                    placeholder=""
                    ref={reviewTextareaRef}
                    value={draft.review_content}
                  />
                </div>

                {errorMessage ? (
                  <p className="text-sm text-[#d92d20]" data-testid="detail-add-rating-error">{errorMessage}</p>
                ) : null}

                <button
                  className="inline-flex h-10 w-full items-center justify-center rounded-[12px] bg-[#5862fb] px-0 py-2 text-sm font-semibold text-white transition hover:bg-[#4953f1] disabled:cursor-not-allowed disabled:opacity-50"
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
                  <span>{submitState === 'submitting' ? '등록 중' : '등록'}</span>
                </button>
              </section>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#dbdbe6] bg-white p-5">
              <p className="text-sm font-medium text-[#222127]">평가할 장소를 찾지 못했어요</p>
              <p className="mt-2 text-sm leading-6 text-[#7e7b8b]">상세 화면으로 돌아가 다시 시도해 주세요.</p>
            </div>
          )}
        </div>
      </div>
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

const MobileBottomTabButton = ({
  active = false,
  ariaLabel,
  children,
  onClick,
  testId,
}: {
  active?: boolean
  ariaLabel?: string
  children: ReactNode
  onClick?: () => void
  testId: string
}) => (
  <button
    aria-current={active ? 'page' : undefined}
    aria-label={ariaLabel}
    className={`mx-auto flex h-10 w-10 flex-col items-center justify-center gap-1 px-2 pb-0 pt-[2px] transition ${
      active ? 'text-[#1c1c1c]' : 'text-[#9692a3] hover:text-[#4d4960]'
    }`}
    data-active={active ? 'true' : 'false'}
    data-testid={testId}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
)

type MobilePrimaryTab = 'map' | 'add' | 'list'

const MobileBottomTabBar = ({ activeTab }: { activeTab: MobilePrimaryTab }) => {
  const openMobilePlaceList = useAppShellStore((state) => state.openMobilePlaceList)
  const openPlaceAdd = useAppShellStore((state) => state.openPlaceAdd)
  const returnToMapBrowse = useAppShellStore((state) => state.returnToMapBrowse)

  return (
    <nav
      aria-label="모바일 하단 탭"
      className="fixed inset-x-0 bottom-0 z-30 h-14 bg-white before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[#f0f0f0] before:content-['']"
      data-testid="mobile-bottom-tab-bar"
      style={MOBILE_SAFE_AREA_BOTTOM_STYLE}
    >
      <div className="grid h-14 grid-cols-3 items-center" data-testid="mobile-bottom-tab-bar-grid">
        <MobileBottomTabButton active={activeTab === 'map'} onClick={returnToMapBrowse} testId="mobile-tab-map">
          <MobileBottomTabIcon
            className="h-6 w-6 shrink-0"
            src={activeTab === 'map' ? MOBILE_BOTTOM_TAB_MAP_ICON.active : MOBILE_BOTTOM_TAB_MAP_ICON.inactive}
            testId="mobile-tab-map-icon"
          />
          <span className="block h-[10px] whitespace-nowrap text-center font-['Pretendard'] text-[10px] font-normal leading-[10px]">지도</span>
        </MobileBottomTabButton>
        <MobileBottomTabButton active={activeTab === 'add'} ariaLabel="장소 추가" onClick={openPlaceAdd} testId="mobile-tab-add">
          <MobileBottomTabIcon
            className="h-6 w-6 shrink-0"
            src={activeTab === 'add' ? MOBILE_BOTTOM_TAB_PLUS_ICON.active : MOBILE_BOTTOM_TAB_PLUS_ICON.inactive}
            testId="mobile-tab-add-icon"
          />
          <span className="block h-[10px] whitespace-nowrap text-center font-['Pretendard'] text-[10px] font-normal leading-[10px]">추가</span>
        </MobileBottomTabButton>
        <MobileBottomTabButton active={activeTab === 'list'} ariaLabel="목록 보기" onClick={openMobilePlaceList} testId="mobile-tab-list">
          <MobileBottomTabIcon
            className="h-6 w-6 shrink-0"
            src={activeTab === 'list' ? MOBILE_BOTTOM_TAB_LIST_ICON.active : MOBILE_BOTTOM_TAB_LIST_ICON.inactive}
            testId="mobile-tab-list-icon"
          />
          <span className="block h-[10px] whitespace-nowrap text-center font-['Pretendard'] text-[10px] font-normal leading-[10px]">목록</span>
        </MobileBottomTabButton>
      </div>
    </nav>
  )
}

const MobileListPage = ({
  onOpenPlaceDetail,
  places,
  selectedPlaceId,
}: {
  onOpenPlaceDetail: (placeId: string) => void
  places: PlaceSummary[]
  selectedPlaceId: string | null
}) => {
  const { signOut } = useAuth()
  const placeListLoad = useAppShellStore((state) => state.placeListLoad)
  const handleSignOut = () => {
    if (!window.confirm(LOGOUT_CONFIRM_MESSAGE)) {
      return
    }

    void signOut()
  }

  return (
    <section className={`${MOBILE_SURFACE_CLASS} z-20 pb-14`} data-testid="mobile-list-page" style={MOBILE_BOTTOM_BAR_SPACER_STYLE}>
      <div className="shrink-0 bg-white" data-testid="mobile-list-header" style={MOBILE_SAFE_AREA_TOP_STYLE}>
        <div className="pb-4 pl-6 pr-5 pt-6" data-testid="mobile-list-header-content">
          <div className="flex items-center justify-between gap-3">
            <DesktopBrowseBrand />
            <button
              aria-label="로그아웃"
              className="inline-flex h-6 w-6 items-center justify-center rounded-[10px] bg-white text-[#7a7a7a] transition hover:text-[#e52e30]"
              data-testid="mobile-list-logout-button"
              onClick={handleSignOut}
              type="button"
            >
              <LogoutIcon className="h-4 w-4" />
              <span className="sr-only">로그아웃</span>
            </button>
          </div>
        </div>
      </div>
      <div className={`${MOBILE_SCROLL_REGION_CLASS} bg-white`} data-testid="mobile-list-scroll-region">
        <PlaceListPanel
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
  onSubmitReview: (placeId: string, draft: ReviewDraft) => Promise<{ status: 'saved' | 'existing_review' | 'error'; message?: string }>
  place: PlaceSummary | undefined
  status: PlaceDetailLoadState
}) => {
  if (detailChildSurface === 'add_rating') {
    return (
      <section className={`${MOBILE_SURFACE_CLASS} z-30`}>
        <AddRatingScreen key={place?.id ?? 'missing-place'} onBack={onAddRatingBack} onSubmit={onSubmitReview} place={place} />
      </section>
    )
  }

  return (
    <section className={`${MOBILE_SURFACE_CLASS} z-30`} data-testid="mobile-detail-page">
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
    <main className="hidden h-screen md:flex" data-testid="desktop-shell">
      <DesktopSidebar
        navigationState={navigationState}
        onOpenPlaceDetail={onOpenPlaceDetail}
        onReturnToMapBrowse={onReturnToMapBrowse}
        places={mapPlaces}
        selectedPlace={selectedPlace}
        selectedPlaceId={selectedPlaceId}
      />
      <section className="relative isolate flex-1 bg-[#f7f6fb]">
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
  onSubmitReview: (placeId: string, draft: ReviewDraft) => Promise<{ status: 'saved' | 'existing_review' | 'error'; message?: string }>
  selectedPlace: PlaceSummary | undefined
}) => {
  const closePlaceAdd = useAppShellStore((state) => state.closePlaceAdd)
  const selectedPlaceId = useAppShellStore((state) => state.selectedPlaceId)
  const placeDetailLoad = useAppShellStore((state) => state.placeDetailLoad)
  const mapLevel = useAppShellStore((state) => state.mapLevel)
  const setMapLevel = useAppShellStore((state) => state.setMapLevel)
  const activeMobileTab: MobilePrimaryTab =
    navigationState === 'mobile_place_list_open'
        ? 'list'
        : 'map'
  const showMobileBottomTabBar =
    navigationState === 'map_browse' || navigationState === 'mobile_place_list_open'

  return (
    <main className={MOBILE_SHELL_CLASS} data-testid="mobile-shell" style={MOBILE_SHELL_STYLE}>
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
      {showMobileBottomTabBar ? <MobileBottomTabBar activeTab={activeMobileTab} /> : null}
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
  const closePlaceDetail = useAppShellStore((state) => state.closePlaceDetail)
  const openDetailAddRating = useAppShellStore((state) => state.openDetailAddRating)
  const closeDetailAddRating = useAppShellStore((state) => state.closeDetailAddRating)
  const syncDetailChildSurface = useAppShellStore((state) => state.syncDetailChildSurface)
  const places = useAppShellStore((state) => state.places)
  const selectedPlaceId = useAppShellStore((state) => state.selectedPlaceId)
  const setSelectedPlaceId = useAppShellStore((state) => state.setSelectedPlaceId)
  const loadPlaceDetailFromApi = useAppShellStore((state) => state.loadPlaceDetail)
  const loadPlaces = useAppShellStore((state) => state.loadPlaces)
  const placeListLoad = useAppShellStore((state) => state.placeListLoad)
  const placeDetailLoad = useAppShellStore((state) => state.placeDetailLoad)
  const submitPlaceReview = useAppShellStore((state) => state.submitPlaceReview)
  const { retry: retryMapRuntime, status: mapRuntimeStatus } = useKakaoScript()
  const { csrfHeaderName, csrfToken } = useAuth()
  const mapPlaces = places.filter(hasCoordinates)
  const routePlaceId = getPlaceIdFromPathname(pathname)
  const routeSelectedPlace = routePlaceId
    ? places.find((place) => place.id === routePlaceId)
    : undefined
  const selectedPlace = routePlaceId
    ? routeSelectedPlace
    : places.find((place) => place.id === selectedPlaceId)
  const effectiveNavigationState = routePlaceId ? 'place_detail_open' : navigationState
  const effectiveDetailChildSurface = routePlaceId ? detailChildSurface : 'detail'

  useEffect(() => {
    if (placeListLoad !== 'idle') {
      return
    }

    void loadPlaces()
  }, [loadPlaces, placeListLoad])

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

      closePlaceDetail()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [closePlaceDetail, syncDetailChildSurface])

  useEffect(() => {
    if (isDesktop) {
      const html = document.documentElement
      html.style.removeProperty('--nurimap-viewport-height')
      html.style.removeProperty('--nurimap-viewport-offset-top')
      html.style.removeProperty('--nurimap-viewport-offset-bottom')
      return
    }

    const html = document.documentElement
    const body = document.body
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousBodyOverscroll = body.style.overscrollBehavior

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'

    return () => {
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
      body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [isDesktop])

  useEffect(() => {
    if (isDesktop) {
      return
    }

    const html = document.documentElement

    const syncViewportMetrics = () => {
      const visualViewport = window.visualViewport
      const viewportHeight = Math.round(visualViewport?.height ?? window.innerHeight)
      const viewportOffsetTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0))
      const viewportOffsetBottom = Math.max(
        0,
        Math.round(window.innerHeight - ((visualViewport?.height ?? window.innerHeight) + (visualViewport?.offsetTop ?? 0))),
      )

      html.style.setProperty('--nurimap-viewport-height', `${viewportHeight}px`)
      html.style.setProperty('--nurimap-viewport-offset-top', `${viewportOffsetTop}px`)
      html.style.setProperty('--nurimap-viewport-offset-bottom', `${viewportOffsetBottom}px`)
    }

    syncViewportMetrics()

    window.addEventListener('resize', syncViewportMetrics)
    window.addEventListener('orientationchange', syncViewportMetrics)
    window.visualViewport?.addEventListener('resize', syncViewportMetrics)
    window.visualViewport?.addEventListener('scroll', syncViewportMetrics)

    return () => {
      window.removeEventListener('resize', syncViewportMetrics)
      window.removeEventListener('orientationchange', syncViewportMetrics)
      window.visualViewport?.removeEventListener('resize', syncViewportMetrics)
      window.visualViewport?.removeEventListener('scroll', syncViewportMetrics)
      html.style.removeProperty('--nurimap-viewport-height')
      html.style.removeProperty('--nurimap-viewport-offset-top')
      html.style.removeProperty('--nurimap-viewport-offset-bottom')
    }
  }, [isDesktop])

  useEffect(() => {
    if (!routePlaceId) {
      return
    }

    if (!routeSelectedPlace) {
      if (placeDetailLoad !== 'loading') {
        void loadPlaceDetailFromApi(routePlaceId)
      }
      return
    }

    if (selectedPlaceId !== routePlaceId) {
      setSelectedPlaceId(routePlaceId)
    }
  }, [loadPlaceDetailFromApi, placeDetailLoad, routePlaceId, routeSelectedPlace, selectedPlaceId, setSelectedPlaceId])

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
    navigateToPath(getDetailRoutePath(placeId))
  }

  const handleReturnToMapBrowse = () => {
    closePlaceDetail()
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

  const handleSubmitReview = async (placeId: string, draft: ReviewDraft) => {
    const result = await submitPlaceReview({
      placeId,
      draft,
      csrfHeaderName,
      csrfToken,
    })

    if (result.status === 'saved') {
      handleCloseAddRating()
    }

    return result
  }

  const isBrowseSurface = effectiveNavigationState === 'map_browse' || effectiveNavigationState === 'mobile_place_list_open'
  const isDetailBootstrapLoading =
    effectiveNavigationState === 'place_detail_open'
    && placeDetailLoad === 'loading'
  const hasBrowseBootstrapError =
    placeListLoad === 'error'
    || mapRuntimeStatus === 'error'
    || mapRuntimeStatus === 'unavailable'
  const isBrowseBootstrapLoading =
    !hasBrowseBootstrapError
    && (placeListLoad === 'idle' || placeListLoad === 'loading' || mapRuntimeStatus === 'loading')

  const handleRetryBrowseBootstrap = async () => {
    if (mapRuntimeStatus === 'error' || mapRuntimeStatus === 'unavailable') {
      retryMapRuntime()
    }

    if (placeListLoad === 'error') {
      await loadPlaces()
    }
  }

  if (isBrowseSurface && isBrowseBootstrapLoading) {
    return isDesktop ? (
      <main className="hidden h-screen md:flex" data-testid="desktop-shell">
        <BrowseBootstrapState mode="loading" />
      </main>
    ) : (
      <main className={MOBILE_SHELL_CLASS} data-testid="mobile-shell" style={MOBILE_SHELL_STYLE}>
        <BrowseBootstrapState mode="loading" />
      </main>
    )
  }

  if (isDetailBootstrapLoading) {
    return isDesktop ? (
      <main className="hidden h-screen md:flex" data-testid="desktop-shell">
        <BrowseBootstrapState mode="loading" />
      </main>
    ) : (
      <main className={MOBILE_SHELL_CLASS} data-testid="mobile-shell" style={MOBILE_SHELL_STYLE}>
        <BrowseBootstrapState mode="loading" />
      </main>
    )
  }

  if (isBrowseSurface && hasBrowseBootstrapError) {
    return isDesktop ? (
      <main className="hidden h-screen md:flex" data-testid="desktop-shell">
        <BrowseBootstrapState mode="error" onRetry={() => { void handleRetryBrowseBootstrap() }} />
      </main>
    ) : (
      <main className={MOBILE_SHELL_CLASS} data-testid="mobile-shell" style={MOBILE_SHELL_STYLE}>
        <BrowseBootstrapState mode="error" onRetry={() => { void handleRetryBrowseBootstrap() }} />
      </main>
    )
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
