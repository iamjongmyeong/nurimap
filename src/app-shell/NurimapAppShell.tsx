import { useEffect, useState } from 'react'
import { MapPane } from './MapPane'
import { useAuth } from '../auth/authContext'
import { DesktopPlaceAddPanel, MobilePlaceAddPage } from './PlaceAddPanels'
import { createInitialReviewDraft, validateReviewDraft, type ReviewDraft } from './placeRepository'
import {
  useAppShellStore,
  type PlaceDetailLoadState,
  type PlaceListLoadState,
} from './appShellStore'
import type { PlaceSummary } from './types'
import { useViewportMode } from './useViewportMode'

type PlaceWithCoordinates = PlaceSummary & {
  latitude: number
  longitude: number
}

const hasCoordinates = (place: PlaceSummary): place is PlaceWithCoordinates =>
  place.latitude !== undefined && place.longitude !== undefined

const detailPanelStyle = {
  top: '24px',
  bottom: '24px',
  width: '390px',
  height: 'calc(100vh - 48px)',
} as const

const addButtonSizeStyle = {
  width: '342px',
  height: '48px',
} as const

const badgeHeightStyle = {
  height: '24px',
} as const

const EmptyState = () => (
  <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 p-6 text-left shadow-sm">
    <p className="text-sm font-semibold text-base-content">아직 등록된 장소가 없어요</p>
    <p className="mt-2 text-sm text-base-content/70">현재 조건에 맞는 장소가 비어 있습니다.</p>
  </div>
)

const LoadingState = () => (
  <div className="flex items-center gap-3 rounded-2xl bg-base-100 p-6 shadow-sm" data-testid="place-list-loading">
    <span className="loading loading-spinner loading-md text-primary" />
    <div>
      <p className="text-sm font-semibold text-base-content">장소 목록을 불러오는 중이에요</p>
      <p className="text-sm text-base-content/70">Plan 02 목록 탐색 기본 상태를 검증합니다.</p>
    </div>
  </div>
)

const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="rounded-2xl bg-base-100 p-6 shadow-sm" data-testid="place-list-error">
    <p className="text-sm font-semibold text-error">장소 목록을 불러오지 못했어요</p>
    <p className="mt-2 text-sm text-base-content/70">현재 목록 영역에서 재시도 액션을 제공합니다.</p>
    <button className="btn btn-outline btn-sm mt-4" onClick={onRetry} type="button">
      다시 시도
    </button>
  </div>
)


const RegistrationNotice = ({ message }: { message: string }) => (
  <div className="mb-4 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success" data-testid="registration-message">
    {message}
  </div>
)

const ZeroPayBadge = () => (
  <span
    className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 text-xs font-bold text-white"
    data-testid="zeropay-badge"
    style={badgeHeightStyle}
  >
    제로페이
  </span>
)

const RatingBadge = ({ averageRating, reviewCount }: { averageRating: number; reviewCount: number }) => (
  <span className="inline-flex items-center rounded-full bg-base-200 px-2.5 text-xs font-semibold text-base-content" style={badgeHeightStyle}>
    ★ {averageRating.toFixed(1)} · 리뷰 {reviewCount}
  </span>
)

const PlaceListItem = ({
  onSelect,
  place,
  selected,
}: {
  onSelect: (placeId: string) => void
  place: PlaceSummary
  selected: boolean
}) => (
  <button
    className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
      selected ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100'
    }`}
    data-testid={`place-list-item-${place.id}`}
    onClick={() => onSelect(place.id)}
    type="button"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-base font-semibold text-base-content">{place.name}</p>
        <p className="mt-1 text-sm text-base-content/70">{place.road_address}</p>
      </div>
      <span className="badge badge-outline badge-sm">{place.place_type === 'restaurant' ? '식당' : '카페'}</span>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <RatingBadge averageRating={place.average_rating} reviewCount={place.review_count} />
      {place.zeropay_status === 'available' ? <ZeroPayBadge /> : null}
    </div>
  </button>
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
    <div className="space-y-3" data-testid="place-list-ready">
      {places.map((place) => (
        <PlaceListItem
          key={place.id}
          onSelect={onSelect}
          place={place}
          selected={selectedPlaceId === place.id}
        />
      ))}
    </div>
  )
}

const DetailLoadingState = () => (
  <div className="mt-6 flex items-center gap-3 rounded-2xl bg-base-200/70 p-5" data-testid="place-detail-loading">
    <span className="loading loading-spinner loading-md text-primary" />
    <div>
      <p className="text-sm font-semibold text-base-content">상세 정보를 불러오는 중이에요</p>
      <p className="text-sm text-base-content/70">필드 대신 진행 중 상태를 표시합니다.</p>
    </div>
  </div>
)

const DetailErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="mt-6 rounded-2xl bg-base-200/70 p-5" data-testid="place-detail-error">
    <p className="text-sm font-semibold text-error">상세 정보를 불러오지 못했어요</p>
    <p className="mt-2 text-sm text-base-content/70">현재 상세 컨테이너에서 재시도 액션을 제공합니다.</p>
    <button className="btn btn-outline btn-sm mt-4" onClick={onRetry} type="button">
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

const DetailCard = ({ place }: { place: PlaceSummary }) => {
  const hasMyReview = place.my_review !== null
  const myReview = hasMyReview ? place.my_review : null
  const { accessToken } = useAuth()
  const submitPlaceReview = useAppShellStore((state) => state.submitPlaceReview)
  const togglePlaceRecommendation = useAppShellStore((state) => state.togglePlaceRecommendation)

  return (
    <div data-testid="place-detail-ready">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Selected Place</p>
          <h3 className="mt-2 text-xl font-bold text-base-content">{place.name}</h3>
        </div>
        <span className="badge badge-outline">{place.place_type === 'restaurant' ? '식당' : '카페'}</span>
      </div>

      <p className="mt-4 text-sm text-base-content/70">{place.road_address}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <RatingBadge averageRating={place.average_rating} reviewCount={place.review_count} />
        {place.zeropay_status === 'available' ? <ZeroPayBadge /> : null}
      </div>

      <dl className="mt-6 grid gap-3 rounded-2xl bg-base-100 p-4 text-sm text-base-content/80 md:grid-cols-2">
        <div>
          <dt className="font-semibold text-base-content">등록자</dt>
          <dd data-testid="detail-created-by">{place.created_by_name}</dd>
        </div>
        <div>
          <dt className="font-semibold text-base-content">추천 수</dt>
          <dd data-testid="detail-recommendation-summary-count">{place.recommendation_count}</dd>
        </div>
        <div>
          <dt className="font-semibold text-base-content">별점 수</dt>
          <dd data-testid="detail-review-count">{place.review_count}</dd>
        </div>
        <div>
          <dt className="font-semibold text-base-content">내 별점 상태</dt>
          <dd data-testid="detail-my-rating-status">{myReview ? `${myReview.rating_score}점` : '아직 평가하지 않음'}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <a
          className="btn btn-primary btn-sm rounded-2xl"
          data-testid="detail-naver-link"
          href={place.naver_place_url}
          rel="noreferrer"
          target="_blank"
        >
          네이버 지도 이동
        </a>
      </div>

      <DetailRecommendationControl
        active={place.my_recommendation_active}
        canRecommend={Boolean(accessToken)}
        onToggle={() => togglePlaceRecommendation(place.id)}
      />

      <div className="mt-6 rounded-2xl bg-base-100 p-4">
        <h4 className="text-sm font-semibold text-base-content">리뷰</h4>
        <div className="mt-3 space-y-3" data-testid="detail-review-list">
          {place.reviews.map((review) => (
            <article className="rounded-2xl bg-base-200/70 p-4 text-sm" key={review.id}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-base-content">{review.author_name}</p>
                <span className="text-xs text-base-content/60">{review.created_at}</span>
              </div>
              <p className="mt-2 font-medium text-base-content">★ {review.rating_score}</p>
              <p className="mt-2 text-base-content/70">{review.content}</p>
            </article>
          ))}
        </div>
      </div>

      {hasMyReview ? (
        <div className="mt-6 rounded-2xl border border-base-300 bg-base-100 p-4" data-testid="detail-my-review">
          <h4 className="text-sm font-semibold text-base-content">내 리뷰</h4>
          <p className="mt-2 text-sm text-base-content/70">{myReview?.content}</p>
        </div>
      ) : (
        <DetailReviewComposer key={place.id} onSubmit={submitPlaceReview} placeId={place.id} />
      )}
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
      <div className="mt-6 rounded-2xl border border-dashed border-base-300 bg-base-200/70 p-5">
        <p className="text-sm font-medium text-base-content">선택된 장소가 아직 없어요</p>
        <p className="mt-2 text-sm leading-6 text-base-content/70">목록이나 지도 마커를 선택하면 상세 흐름이 열립니다.</p>
      </div>
    )
  }

  return <DetailCard place={place} />
}

const DesktopSidebar = ({
  places,
  selectedPlaceId,
}: {
  places: PlaceSummary[]
  selectedPlaceId: string | null
}) => {
  const { signOut } = useAuth()
  const openPlaceAdd = useAppShellStore((state) => state.openPlaceAdd)
  const openPlaceDetail = useAppShellStore((state) => state.openPlaceDetail)
  const placeListLoad = useAppShellStore((state) => state.placeListLoad)
  const retryPlaceList = useAppShellStore((state) => state.retryPlaceList)

  return (
    <aside className="flex h-screen w-[390px] flex-col border-r border-base-300 bg-base-200 px-6 py-6" data-testid="desktop-sidebar">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Nurimap</p>
          <h2 className="mt-1 text-2xl font-bold text-base-content">장소 탐색</h2>
          <p className="mt-2 text-sm text-base-content/70">목록과 지도에서 같은 장소를 비교하며 탐색할 수 있습니다.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm rounded-2xl" onClick={() => { void signOut() }} type="button">
            로그아웃
          </button>
          <button aria-label="사이드바 접기 또는 펼치기" className="btn btn-ghost btn-square btn-sm" type="button">
            ☰
          </button>
        </div>
      </div>

      <button
        className="btn btn-primary mt-6 self-center rounded-2xl text-base font-semibold"
        data-testid="desktop-add-button"
        onClick={openPlaceAdd}
        style={addButtonSizeStyle}
        type="button"
      >
        장소 추가
      </button>

      <div className="mt-6 flex-1 overflow-auto">
        <PlaceListPanel
          onRetry={retryPlaceList}
          onSelect={openPlaceDetail}
          places={placeListLoad === 'ready' ? places : []}
          selectedPlaceId={selectedPlaceId}
          status={placeListLoad}
        />
      </div>
    </aside>
  )
}

const DesktopDetailPanel = ({
  onClose,
  place,
  registrationMessage,
  status,
}: {
  onClose: () => void
  place: PlaceSummary | undefined
  registrationMessage: string | null
  status: PlaceDetailLoadState
}) => (
  <section className="absolute left-6 rounded-[28px] border border-base-300 bg-base-100/95 p-6 shadow-2xl backdrop-blur" data-testid="desktop-detail-panel" style={detailPanelStyle}>
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Floating Detail Panel</p>
          <h3 className="mt-2 text-xl font-bold text-base-content">선택된 장소 상세 영역</h3>
        </div>
        <button aria-label="상세 패널 닫기" className="btn btn-ghost btn-circle btn-sm" onClick={onClose} type="button">
          ✕
        </button>
      </div>
      {registrationMessage ? <RegistrationNotice message={registrationMessage} /> : null}
      <DetailBody onRetry={useAppShellStore.getState().retryPlaceDetail} place={place} status={status} />
    </div>
  </section>
)

const MobileFloatingActions = () => {
  const openMobilePlaceList = useAppShellStore((state) => state.openMobilePlaceList)
  const openPlaceAdd = useAppShellStore((state) => state.openPlaceAdd)

  return (
    <div className="absolute inset-x-4 bottom-6 z-10 flex gap-3" data-testid="mobile-floating-actions">
      <button className="btn btn-neutral flex-1 rounded-2xl" onClick={openMobilePlaceList} type="button">
        목록 보기
      </button>
      <button className="btn btn-primary flex-1 rounded-2xl" onClick={openPlaceAdd} type="button">
        장소 추가
      </button>
    </div>
  )
}

const MobileListPage = ({
  places,
  selectedPlaceId,
}: {
  places: PlaceSummary[]
  selectedPlaceId: string | null
}) => {
  const openPlaceDetail = useAppShellStore((state) => state.openPlaceDetail)
  const placeListLoad = useAppShellStore((state) => state.placeListLoad)
  const retryPlaceList = useAppShellStore((state) => state.retryPlaceList)
  const returnToMapBrowse = useAppShellStore((state) => state.returnToMapBrowse)

  return (
    <section className="absolute inset-0 z-20 flex min-h-screen flex-col bg-base-100" data-testid="mobile-list-page">
      <div className="flex items-center justify-between border-b border-base-300 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Mobile List</p>
          <h2 className="text-lg font-bold text-base-content">장소 목록 페이지</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={returnToMapBrowse} type="button">
          지도 보기
        </button>
      </div>
      <div className="flex-1 overflow-auto px-4 py-6">
        <PlaceListPanel
          onRetry={retryPlaceList}
          onSelect={openPlaceDetail}
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
  registrationMessage,
  status,
}: {
  onBack: () => void
  place: PlaceSummary | undefined
  registrationMessage: string | null
  status: PlaceDetailLoadState
}) => (
  <section className="absolute inset-0 z-30 flex min-h-screen flex-col bg-base-100" data-testid="mobile-detail-page">
    <div className="flex items-center gap-3 border-b border-base-300 px-4 py-4">
      <button className="btn btn-ghost btn-sm" onClick={onBack} type="button">
        ← 뒤로
      </button>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Place Detail</p>
        <h2 className="text-lg font-bold text-base-content">전체 화면 상세</h2>
      </div>
    </div>
    <div className="flex-1 overflow-auto px-4 py-6">
      <div className="rounded-[28px] border border-base-300 bg-base-100 p-6 shadow-sm">
        {registrationMessage ? <RegistrationNotice message={registrationMessage} /> : null}
      <DetailBody onRetry={useAppShellStore.getState().retryPlaceDetail} place={place} status={status} />
      </div>
    </div>
  </section>
)

const DesktopAppShell = ({
  mapPlaces,
  selectedPlace,
}: {
  mapPlaces: PlaceSummary[]
  selectedPlace: PlaceSummary | undefined
}) => {
  const closePlaceAdd = useAppShellStore((state) => state.closePlaceAdd)
  const closePlaceDetail = useAppShellStore((state) => state.closePlaceDetail)
  const navigationState = useAppShellStore((state) => state.navigationState)
  const openPlaceDetail = useAppShellStore((state) => state.openPlaceDetail)
  const selectedPlaceId = useAppShellStore((state) => state.selectedPlaceId)
  const placeDetailLoad = useAppShellStore((state) => state.placeDetailLoad)
  const registrationMessage = useAppShellStore((state) => state.registrationMessage)
  const mapLevel = useAppShellStore((state) => state.mapLevel)
  const setMapLevel = useAppShellStore((state) => state.setMapLevel)

  return (
    <main className="hidden md:flex" data-testid="desktop-shell">
      <DesktopSidebar places={mapPlaces} selectedPlaceId={selectedPlaceId} />
      <section className="relative flex-1 min-h-screen">
        <MapPane
          mapLevel={mapLevel}
          onMapLevelChange={setMapLevel}
          onMarkerSelect={openPlaceDetail}
          places={mapPlaces}
          selectedPlaceId={selectedPlaceId}
        />
        {navigationState === 'place_detail_open' ? (
          <DesktopDetailPanel onClose={closePlaceDetail} place={selectedPlace} registrationMessage={registrationMessage} status={placeDetailLoad} />
        ) : null}
        {navigationState === 'place_add_open' ? <DesktopPlaceAddPanel onClose={closePlaceAdd} /> : null}
      </section>
    </main>
  )
}

const MobileAppShell = ({
  mapPlaces,
  selectedPlace,
}: {
  mapPlaces: PlaceSummary[]
  selectedPlace: PlaceSummary | undefined
}) => {
  const closePlaceAdd = useAppShellStore((state) => state.closePlaceAdd)
  const navigationState = useAppShellStore((state) => state.navigationState)
  const openPlaceDetail = useAppShellStore((state) => state.openPlaceDetail)
  const selectedPlaceId = useAppShellStore((state) => state.selectedPlaceId)
  const closePlaceDetail = useAppShellStore((state) => state.closePlaceDetail)
  const placeDetailLoad = useAppShellStore((state) => state.placeDetailLoad)
  const registrationMessage = useAppShellStore((state) => state.registrationMessage)
  const mapLevel = useAppShellStore((state) => state.mapLevel)
  const setMapLevel = useAppShellStore((state) => state.setMapLevel)

  const handleBack = () => {
    if (window.history.state?.nurimapDetail === true) {
      window.history.back()
      return
    }

    closePlaceDetail()
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-base-100 md:hidden" data-testid="mobile-shell">
      <MapPane
        mapLevel={mapLevel}
        onMapLevelChange={setMapLevel}
        onMarkerSelect={openPlaceDetail}
        places={mapPlaces}
        selectedPlaceId={selectedPlaceId}
      />
      {navigationState === 'mobile_place_list_open' ? (
        <MobileListPage places={mapPlaces} selectedPlaceId={selectedPlaceId} />
      ) : null}
      {navigationState === 'place_detail_open' ? (
        <MobileDetailPage onBack={handleBack} place={selectedPlace} registrationMessage={registrationMessage} status={placeDetailLoad} />
      ) : null}
      {navigationState === 'place_add_open' ? <MobilePlaceAddPage onClose={closePlaceAdd} /> : null}
      {navigationState !== 'place_detail_open' ? <MobileFloatingActions /> : null}
    </main>
  )
}

export const NurimapAppShell = () => {
  const { isDesktop } = useViewportMode()
  const navigationState = useAppShellStore((state) => state.navigationState)
  const returnToMapBrowse = useAppShellStore((state) => state.returnToMapBrowse)
  const places = useAppShellStore((state) => state.places)
  const selectedPlaceId = useAppShellStore((state) => state.selectedPlaceId)
  const mapPlaces = places.filter(hasCoordinates)
  const selectedPlace = mapPlaces.find((place) => place.id === selectedPlaceId)

  useEffect(() => {
    if (isDesktop || navigationState !== 'place_detail_open') {
      return
    }

    window.history.pushState({ nurimapDetail: true }, '')
  }, [isDesktop, navigationState])

  useEffect(() => {
    if (isDesktop) {
      return
    }

    const handlePopState = () => {
      returnToMapBrowse()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isDesktop, returnToMapBrowse])

  return isDesktop ? (
    <DesktopAppShell mapPlaces={mapPlaces} selectedPlace={selectedPlace} />
  ) : (
    <MobileAppShell mapPlaces={mapPlaces} selectedPlace={selectedPlace} />
  )
}
