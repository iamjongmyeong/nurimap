import { useMemo, useState } from 'react'
import { NAVER_URL_ERROR_MESSAGE, normalizeNaverMapUrl } from './naverUrl'
import { registerOrMergePlace, validateRegistrationDraft } from './placeRepository'
import { useAppShellStore } from './appShellStore'
import type { PlaceLookupResult, PlaceLookupSuccess } from '../server/placeLookupTypes'
import type { PlaceType, ZeropayStatus } from './types'

type PlaceAddPanelProps = {
  onClose: () => void
}

type PlaceLookupState = 'idle' | 'validating_url' | 'loading' | 'error'
type PlaceSubmitState = 'idle' | 'submitting' | 'error'

type RegistrationDraft = {
  place_type: PlaceType
  zeropay_status: ZeropayStatus
  rating_score: number
  review_content: string
}

const REVIEW_LIMIT = 500

const FailureModal = ({
  title,
  message,
  onClose,
  onRetry,
}: {
  title: string
  message: string
  onClose: () => void
  onRetry: () => void
}) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4" data-testid="place-lookup-error-modal">
    <div className="w-full max-w-sm rounded-[28px] bg-base-100 p-6 shadow-2xl">
      <h3 className="text-lg font-bold text-base-content">{title}</h3>
      <p className="mt-3 text-sm text-base-content/70">{message}</p>
      <div className="mt-6 flex gap-3">
        <button className="btn btn-primary flex-1 rounded-2xl" onClick={onRetry} type="button">
          다시 시도
        </button>
        <button className="btn btn-ghost flex-1 rounded-2xl" onClick={onClose} type="button">
          닫기
        </button>
      </div>
    </div>
  </div>
)

const ExistingReviewModal = ({
  onClose,
  onOpenDetail,
}: {
  onClose: () => void
  onOpenDetail: () => void
}) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4" data-testid="existing-review-modal">
    <div className="w-full max-w-sm rounded-[28px] bg-base-100 p-6 shadow-2xl">
      <h3 className="text-lg font-bold text-base-content">이미 리뷰를 남긴 장소예요</h3>
      <div className="mt-6 flex gap-3">
        <button className="btn btn-primary flex-1 rounded-2xl" onClick={onOpenDetail} type="button">
          장소 상세 보기
        </button>
        <button className="btn btn-ghost flex-1 rounded-2xl" onClick={onClose} type="button">
          닫기
        </button>
      </div>
    </div>
  </div>
)

const PlaceLookupSummary = ({ result }: { result: PlaceLookupSuccess['data'] }) => (
  <div className="rounded-2xl bg-base-200 p-4 text-sm text-base-content/80" data-testid="place-lookup-summary">
    <div className="flex items-center justify-between gap-3">
      <p className="font-semibold text-base-content">조회된 장소 정보</p>
      <span className="badge badge-outline badge-sm">읽기 전용</span>
    </div>
    <div className="mt-3 space-y-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">장소명</p>
        <p className="mt-1 text-base font-semibold text-base-content">{result.name}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">대표 주소</p>
        <p className="mt-1">{result.representative_address}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/50">canonical URL</p>
        <p className="mt-1 break-all">{result.canonical_url}</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <p>lat: {result.latitude}</p>
        <p>lng: {result.longitude}</p>
      </div>
    </div>
  </div>
)

const StarRatingField = ({
  rating,
  onChange,
}: {
  rating: number
  onChange: (value: number) => void
}) => (
  <div className="space-y-2" data-testid="rating-field">
    <p className="text-sm font-semibold text-base-content">초기 별점</p>
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          aria-label={`${value}점`}
          className={`btn btn-circle btn-sm ${value <= rating ? 'btn-warning' : 'btn-ghost'}`}
          data-testid={`rating-star-${value}`}
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          ★
        </button>
      ))}
    </div>
  </div>
)

const RegistrationStep = ({
  draft,
  errorMessage,
  lookupResult,
  onDraftChange,
}: {
  draft: RegistrationDraft
  errorMessage: string | null
  lookupResult: PlaceLookupSuccess['data']
  onDraftChange: (draft: RegistrationDraft) => void
}) => (
  <div className="space-y-4" data-testid="place-registration-step">
    <PlaceLookupSummary result={lookupResult} />

    <label className="form-control w-full gap-2">
      <span className="label-text font-semibold text-base-content">장소 유형</span>
      <select
        className="select select-bordered w-full"
        data-testid="place-type-select"
        onChange={(event) => onDraftChange({ ...draft, place_type: event.target.value as PlaceType })}
        value={draft.place_type}
      >
        <option value="restaurant">식당</option>
        <option value="cafe">카페</option>
      </select>
    </label>

    <label className="form-control w-full gap-2">
      <span className="label-text font-semibold text-base-content">제로페이 상태</span>
      <select
        className="select select-bordered w-full"
        data-testid="zeropay-status-select"
        onChange={(event) => onDraftChange({ ...draft, zeropay_status: event.target.value as ZeropayStatus })}
        value={draft.zeropay_status}
      >
        <option value="available">available</option>
        <option value="unavailable">unavailable</option>
        <option value="needs_verification">needs_verification</option>
      </select>
    </label>

    <StarRatingField rating={draft.rating_score} onChange={(rating_score) => onDraftChange({ ...draft, rating_score })} />

    <label className="form-control w-full gap-2">
      <span className="label-text font-semibold text-base-content">초기 리뷰</span>
      <textarea
        className="textarea textarea-bordered min-h-32"
        data-testid="review-content-input"
        onChange={(event) => onDraftChange({ ...draft, review_content: event.target.value })}
        value={draft.review_content}
      />
      <span className="label-text-alt text-base-content/60">{draft.review_content.length} / {REVIEW_LIMIT}</span>
    </label>

    {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}
  </div>
)

const PlaceAddForm = ({ onClose }: PlaceAddPanelProps) => {
  const applyRegistrationResult = useAppShellStore((state) => state.applyRegistrationResult)
  const openPlaceDetail = useAppShellStore((state) => state.openPlaceDetail)
  const places = useAppShellStore((state) => state.places)

  const [rawUrl, setRawUrl] = useState('')
  const [lookupErrorMessage, setLookupErrorMessage] = useState<string | null>(null)
  const [lookupState, setLookupState] = useState<PlaceLookupState>('idle')
  const [lookupResult, setLookupResult] = useState<PlaceLookupSuccess['data'] | null>(null)
  const [failureMessage, setFailureMessage] = useState<string | null>(null)
  const [submitState, setSubmitState] = useState<PlaceSubmitState>('idle')
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null)
  const [duplicateReviewPlaceId, setDuplicateReviewPlaceId] = useState<string | null>(null)
  const [draft, setDraft] = useState<RegistrationDraft>({
    place_type: 'restaurant',
    zeropay_status: 'needs_verification',
    rating_score: 5,
    review_content: '',
  })

  const duplicateReviewPlace = useMemo(
    () => (duplicateReviewPlaceId ? places.find((place) => place.id === duplicateReviewPlaceId) ?? null : null),
    [duplicateReviewPlaceId, places],
  )

  const resetForNewLookup = () => {
    setLookupResult(null)
    setSubmitErrorMessage(null)
    setSubmitState('idle')
    setDuplicateReviewPlaceId(null)
    setDraft({
      place_type: 'restaurant',
      zeropay_status: 'needs_verification',
      rating_score: 5,
      review_content: '',
    })
  }

  const executeLookup = async (targetRawUrl: string) => {
    if (lookupState === 'loading') {
      return
    }

    try {
      setLookupState('validating_url')
      const normalized = normalizeNaverMapUrl(targetRawUrl)
      setLookupErrorMessage(null)
      setLookupState('loading')
      resetForNewLookup()

      const response = await fetch('/api/place-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rawUrl: targetRawUrl }),
      })

      const result = (await response.json()) as PlaceLookupResult

      if (!response.ok || result.status === 'error') {
        setLookupResult(null)
        setFailureMessage(result.status === 'error' ? result.error.message : '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.')
        setLookupState('error')
        return
      }

      const existingPlaceWithMyReview = places.find(
        (place) => place.naver_place_id === normalized.naverPlaceId && place.my_review !== null,
      )

      if (existingPlaceWithMyReview) {
        setDuplicateReviewPlaceId(existingPlaceWithMyReview.id)
      } else {
        setLookupResult(result.data)
      }
      setFailureMessage(null)
      setLookupState('idle')
    } catch (error) {
      const message = error instanceof Error ? error.message : NAVER_URL_ERROR_MESSAGE
      setLookupResult(null)
      if (message === NAVER_URL_ERROR_MESSAGE) {
        setLookupErrorMessage(message)
      } else {
        setFailureMessage(message)
      }
      setLookupState('error')
    }
  }

  const validateDraft = () => {
    if (!lookupResult) {
      return '좌표를 확인한 뒤에만 등록할 수 있어요.'
    }

    return validateRegistrationDraft({
      draft,
      lookupData: {
        latitude: lookupResult.latitude,
        longitude: lookupResult.longitude,
      },
    })
  }

  const handleSubmit = async () => {
    await executeLookup(rawUrl)
  }

  const handleSave = async () => {
    if (!lookupResult) {
      return
    }

    const validationError = validateDraft()
    if (validationError) {
      setSubmitErrorMessage(validationError)
      setSubmitState('error')
      return
    }

    setSubmitState('submitting')
    setSubmitErrorMessage(null)
    await new Promise((resolve) => setTimeout(resolve, 50))

    if (lookupResult.name === '저장 실패 장소') {
      setSubmitErrorMessage('등록을 저장하지 못했어요. 다시 시도해 주세요.')
      setSubmitState('error')
      return
    }

    const result = registerOrMergePlace({
      draft,
      lookupData: lookupResult,
      places,
    })

    if (result.status === 'existing_review') {
      setDuplicateReviewPlaceId(result.place.id)
      setSubmitState('idle')
      return
    }

    applyRegistrationResult(result)
    setSubmitState('idle')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Place Add</p>
          <h2 className="mt-2 text-xl font-bold text-base-content">네이버 지도 URL 확인</h2>
        </div>
        <button className="btn btn-ghost btn-circle btn-sm" onClick={onClose} type="button">
          ✕
        </button>
      </div>

      <label className="form-control w-full gap-2">
        <span className="label-text font-semibold text-base-content">네이버 지도 URL</span>
        <input
          aria-label="네이버 지도 URL"
          className={`input input-bordered w-full ${lookupErrorMessage ? 'input-error' : ''}`}
          onChange={(event) => setRawUrl(event.target.value)}
          placeholder="https://map.naver.com/p/entry/place/123456789"
          type="url"
          value={rawUrl}
        />
      </label>

      {lookupErrorMessage ? <p className="text-sm text-error">{lookupErrorMessage}</p> : null}

      {lookupResult ? (
        <RegistrationStep
          draft={draft}
          errorMessage={submitErrorMessage}
          lookupResult={lookupResult}
          onDraftChange={setDraft}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="btn btn-primary rounded-2xl"
          disabled={lookupState === 'loading'}
          onClick={() => {
            void handleSubmit()
          }}
          type="button"
        >
          {lookupState === 'loading' ? '조회 중...' : 'URL 확인'}
        </button>

        {lookupResult ? (
          <button
            className="btn btn-secondary rounded-2xl"
            data-testid="place-submit-button"
            disabled={submitState === 'submitting'}
            onClick={() => {
              void handleSave()
            }}
            type="button"
          >
            {submitState === 'submitting' ? '저장 중...' : '장소 등록'}
          </button>
        ) : null}
      </div>

      {lookupState === 'loading' ? (
        <div className="rounded-2xl bg-base-200 p-4 text-sm text-base-content/80" data-testid="place-lookup-loading">
          장소 정보를 조회하는 중입니다.
        </div>
      ) : null}

      {submitState === 'submitting' ? (
        <div className="rounded-2xl bg-base-200 p-4 text-sm text-base-content/80" data-testid="place-submit-loading">
          장소를 저장하는 중입니다.
        </div>
      ) : null}

      {failureMessage ? (
        <FailureModal
          message={failureMessage}
          onClose={() => {
            setFailureMessage(null)
            setLookupState('idle')
          }}
          onRetry={() => {
            setFailureMessage(null)
            void executeLookup(rawUrl)
          }}
          title="조회에 실패했어요"
        />
      ) : null}

      {duplicateReviewPlace ? (
        <ExistingReviewModal
          onClose={() => {
            setDuplicateReviewPlaceId(null)
            onClose()
          }}
          onOpenDetail={() => {
            openPlaceDetail(duplicateReviewPlace.id)
            setDuplicateReviewPlaceId(null)
          }}
        />
      ) : null}
    </div>
  )
}

export const DesktopPlaceAddPanel = ({ onClose }: PlaceAddPanelProps) => (
  <section
    className="absolute right-6 top-6 bottom-6 z-20 w-[390px] rounded-[28px] border border-base-300 bg-base-100/95 p-6 shadow-2xl backdrop-blur"
    data-testid="desktop-place-add-panel"
  >
    <PlaceAddForm onClose={onClose} />
  </section>
)

export const MobilePlaceAddPage = ({ onClose }: PlaceAddPanelProps) => (
  <section className="absolute inset-0 z-30 flex min-h-screen flex-col bg-base-100" data-testid="mobile-place-add-page">
    <div className="border-b border-base-300 px-4 py-4">
      <PlaceAddForm onClose={onClose} />
    </div>
  </section>
)
