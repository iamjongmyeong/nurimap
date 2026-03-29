import { useState, type CSSProperties } from 'react'
import {
  lookupPlaceRegistrationPrefill,
  type PlaceLookupPrefillData,
  type PlaceRegistrationPreparationResult,
  type PlaceRegistrationResult,
} from './placeRepository'
import { useAppShellStore } from './appShellStore'
import { useAuth } from '../auth/authContext'
import { useViewportMode } from './useViewportMode'
import type { PlaceType, ZeropayStatus } from './types'

export type PlaceAddStep = 'url_entry' | 'manual_form'

export type PlaceAddPrefill = PlaceLookupPrefillData

type PlaceAddPanelProps = {
  onClose: () => void
  onContinueToManual?: (prefill?: PlaceAddPrefill) => void
  prefill?: PlaceAddPrefill | null
  step?: PlaceAddStep
}

type PlaceSubmitState = 'idle' | 'submitting' | 'error'

type RegistrationDraft = {
  name: string
  road_address: string
  place_type: PlaceType
  zeropay_status: ZeropayStatus
  rating_score: number
  review_content: string
}

type FieldErrors = Partial<Record<'name' | 'road_address' | 'form', string>>

type SegmentedOption<T extends string> = {
  label: string
  testId: string
  value: T
}

const GENERIC_SUBMIT_ERROR_MESSAGE = '등록하지 못했어요. 잠시 후 다시 시도해 주세요.'
const REVIEW_LIMIT = 500
const BASE_TEXT_FIELD_CLASSES = 'w-full rounded-xl border border-[#EBEBEB] bg-white px-3 text-base text-[#1f1f1f] placeholder:text-[#C9C9C9] focus:border-[#5862FB] focus:outline-none focus:ring-0 focus:shadow-none'
const PLACE_ADD_BACK_ICON_SRC = '/assets/icons/icon-navigation-back-24.svg'
const PLACE_LOOKUP_FALLBACK_ALERT_MESSAGE = '장소 정보 추출에 실패했어요 🥲\n장소 정보를 직접 입력해주세요.'
const PLACE_ADD_URL_ENTRY_HELPER_STEPS = [
  "네이버 지도에서 '공유' 버튼 클릭",
  'URL 복사한 뒤 입력',
  '이름/주소 불러오기 실패하면 직접 입력',
] as const
const MOBILE_HISTORY_SESSION_KEY_FIELD = 'mobileBrowseSessionKey'
const MOBILE_DETAIL_ORIGIN_FIELD = 'mobileDetailOriginNavigationState'
const MOBILE_DETAIL_ORIGIN_SESSION_KEY_FIELD = 'mobileDetailOriginSessionKey'
const PLACE_ADD_ORIGIN_NAVIGATION_STATE_FIELD = 'placeAddOriginNavigationState'

const PLACE_TYPE_OPTIONS: SegmentedOption<PlaceType>[] = [
  { value: 'restaurant', label: '음식점', testId: 'place-type-option-restaurant' },
  { value: 'cafe', label: '카페', testId: 'place-type-option-cafe' },
]

const ZEROPAY_OPTIONS: SegmentedOption<ZeropayStatus>[] = [
  { value: 'available', label: '가능', testId: 'zeropay-option-available' },
  { value: 'unavailable', label: '불가능', testId: 'zeropay-option-unavailable' },
  { value: 'needs_verification', label: '확인 필요', testId: 'zeropay-option-needs-verification' },
]

const BackArrowIcon = () => (
  <img alt="" aria-hidden="true" height="24" src={PLACE_ADD_BACK_ICON_SRC} width="24" />
)

const SegmentedField = <T extends string>({
  label,
  onChange,
  options,
  testId,
  value,
}: {
  label: string
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  testId: string
  value: T
}) => {
  const selectedIndex = Math.max(options.findIndex((option) => option.value === value), 0)

  return (
    <div className="space-y-3" data-testid={testId}>
      <p className="text-xs font-medium tracking-[-0.3px] text-[#1c1c1c]">{label}</p>
      <div
        className="relative flex w-full items-center rounded-xl bg-[#F4F4F5] p-1"
        data-testid={`${testId}-toggle`}
      >
        <div
          aria-hidden="true"
          className="absolute bottom-1 left-1 top-1 rounded-lg bg-white shadow-[0_1px_3px_rgba(28,28,28,0.06)] transition-transform duration-200 ease-out motion-reduce:transition-none"
          data-testid={`${testId}-indicator`}
          style={{
            width: `calc((100% - 8px) / ${options.length})`,
            transform: `translateX(${selectedIndex * 100}%)`,
          }}
        />
        
        {options.map((option) => {
          const isSelected = option.value === value
          return (
            <button
              aria-pressed={isSelected}
              className={`relative z-10 flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg px-[10px] py-2 text-base leading-6 transition-colors duration-200 motion-reduce:transition-none ${
                isSelected ? 'text-[#1C1C1C]' : 'text-[#7A7A7A]'
              }`}
              data-testid={option.testId}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              <span className="truncate">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const StarRatingField = ({
  isDesktop,
  rating,
  onChange,
}: {
  isDesktop: boolean
  rating: number
  onChange: (value: number) => void
}) => (
  <div className="space-y-3" data-testid="rating-field">
    <p className="text-xs font-medium text-[#1f1f1f]">평가</p>
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((value) => {
        const active = value <= rating
        return (
          <button
            aria-label={`${value}점`}
            className={`flex h-6 w-6 cursor-pointer items-center justify-center ${
              isDesktop ? 'transition-transform duration-150 hover:scale-110' : ''
            } ${active ? 'text-red-500' : 'text-slate-300'}`}
            data-testid={`rating-star-${value}`}
            key={value}
            onMouseEnter={isDesktop ? () => onChange(value) : undefined}
            onClick={() => onChange(value)}
            type="button"
          >
            <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M11.9995 19.3643L6.46613 22.6977C6.22168 22.8532 5.96613 22.9199 5.69946 22.8977C5.4328 22.8754 5.19946 22.7865 4.99946 22.631C4.79946 22.4754 4.64391 22.2812 4.5328 22.0483C4.42168 21.8154 4.39946 21.5541 4.46613 21.2643L5.9328 14.9643L1.0328 10.731C0.810573 10.531 0.671906 10.303 0.616795 10.047C0.561684 9.79099 0.578129 9.54121 0.666129 9.29766C0.754129 9.0541 0.887462 8.8541 1.06613 8.69766C1.2448 8.54121 1.48924 8.44121 1.79946 8.39766L8.26613 7.83099L10.7661 1.89766C10.8772 1.63099 11.0497 1.43099 11.2835 1.29766C11.5172 1.16432 11.7559 1.09766 11.9995 1.09766C12.243 1.09766 12.4817 1.16432 12.7155 1.29766C12.9492 1.43099 13.1217 1.63099 13.2328 1.89766L15.7328 7.83099L22.1995 8.39766C22.5106 8.4421 22.755 8.5421 22.9328 8.69766C23.1106 8.85321 23.2439 9.05321 23.3328 9.29766C23.4217 9.5421 23.4386 9.79232 23.3835 10.0483C23.3284 10.3043 23.1892 10.5319 22.9661 10.731L18.0661 14.9643L19.5328 21.2643C19.5995 21.5532 19.5772 21.8145 19.4661 22.0483C19.355 22.2821 19.1995 22.4763 18.9995 22.631C18.7995 22.7857 18.5661 22.8745 18.2995 22.8977C18.0328 22.9208 17.7772 22.8541 17.5328 22.6977L11.9995 19.3643Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )
      })}
    </div>
  </div>
)

const createInitialDraft = (prefill?: Partial<Pick<RegistrationDraft, 'name' | 'road_address'>>): RegistrationDraft => ({
  name: prefill?.name ?? '',
  road_address: prefill?.road_address ?? '',
  place_type: 'restaurant',
  zeropay_status: 'available',
  rating_score: 5,
  review_content: '',
})

type PlaceEntryResponse =
  | PlaceRegistrationResult
  | (PlaceRegistrationPreparationResult & { submissionId?: string })
  | {
      status: 'error'
      error: {
        code: string
        message: string
      }
    }
  | {
      error?: {
        message?: string
      }
    }

const buildRequiredFieldErrors = (draft: RegistrationDraft): FieldErrors => {
  const errors: FieldErrors = {}

  if (!draft.name.trim()) {
    errors.name = '이름을 입력해 주세요.'
  }

  if (!draft.road_address.trim()) {
    errors.road_address = '주소를 입력해 주세요.'
  }

  return errors
}

const hasCompletedRequiredFields = (draft: RegistrationDraft) =>
  draft.name.trim() !== ''
  && draft.road_address.trim() !== ''

const clampReviewContent = (value: string) => Array.from(value).slice(0, REVIEW_LIMIT).join('')
const formatDialogMessage = (message: string) => message.replace(/([.!?])\s+/g, '$1\n')
const getDetailRoutePath = (placeId: string) => `/places/${encodeURIComponent(placeId)}`
const readHistoryStateRecord = (state: unknown): Record<string, unknown> =>
  state && typeof state === 'object'
    ? state as Record<string, unknown>
    : {}
const isBrowseNavigationState = (value: unknown): value is 'map_browse' | 'mobile_place_list_open' =>
  value === 'map_browse' || value === 'mobile_place_list_open'
const encodePlaceSubmissionId = (draft: {
  name: string
  roadAddress: string
  placeType: PlaceType
  reviewContent: string
  ratingScore: number
  zeropayStatus: ZeropayStatus
}) => {
  const json = JSON.stringify(draft)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '')
}

const buildManualFormKey = (prefill?: PlaceAddPrefill | null) =>
  `${prefill?.name ?? ''}::${prefill?.road_address ?? ''}`

const PlaceAddUrlEntry = ({
  onClose,
  onContinueToManual,
}: Pick<PlaceAddPanelProps, 'onClose' | 'onContinueToManual'>) => {
  const { csrfHeaderName, csrfToken } = useAuth()
  const [rawUrl, setRawUrl] = useState('')
  const [urlFieldError, setUrlFieldError] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'submitting'>('idle')
  const isLookupDisabled = submitState === 'submitting' || rawUrl.trim() === ''

  const handleLookup = async () => {
    if (submitState === 'submitting') {
      return
    }

    if (rawUrl.trim() === '') {
      return
    }

    setSubmitState('submitting')
    setUrlFieldError('')

    try {
      const result = await lookupPlaceRegistrationPrefill({
        rawUrl: rawUrl.trim(),
        csrfHeaderName,
        csrfToken,
      })

      if (result.status === 'success') {
        onContinueToManual?.(result.data)
        return
      }

      if (result.code === 'invalid_url') {
        setUrlFieldError('네이버 지도 URL을 입력해주세요.')
        return
      }

      window.alert(PLACE_LOOKUP_FALLBACK_ALERT_MESSAGE)
      onContinueToManual?.()
    } catch {
      window.alert(PLACE_LOOKUP_FALLBACK_ALERT_MESSAGE)
      onContinueToManual?.()
    } finally {
      setSubmitState('idle')
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="place-add-url-entry-screen">
      <div className="sticky top-0 z-10 h-14 bg-white" data-testid="place-add-url-entry-header">
        <div className="relative h-full">
          <button
            aria-label="뒤로가기"
            className="absolute left-6 top-6 inline-flex h-6 w-6 cursor-pointer items-center justify-center"
            data-testid="place-add-url-entry-back-button"
            onClick={onClose}
            type="button"
          >
            <BackArrowIcon />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white px-6">
        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-6 pt-4">
          <div className="w-full rounded-xl bg-[#EEF] p-4" data-testid="place-add-url-entry-helper">
            <ol className="list-decimal break-keep pl-6 text-base font-medium leading-6 tracking-[-0.4px] text-[#5862FB]">
              {PLACE_ADD_URL_ENTRY_HELPER_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-2" data-testid="place-add-url-entry-field">
            <label className="text-xs font-medium tracking-[-0.3px] text-[#1c1c1c]" htmlFor="place-add-naver-url-input">
              URL
            </label>
            <input
              aria-label="URL"
              aria-describedby={urlFieldError ? 'place-add-naver-url-input-error' : undefined}
              aria-invalid={urlFieldError ? 'true' : 'false'}
              className={`h-12 rounded-xl border bg-white px-3 text-base text-[#1f1f1f] placeholder:text-[#c9c9c9] focus:outline-none focus:ring-0 ${
                urlFieldError
                  ? 'border-[#e53935] focus:border-[#e53935]'
                  : 'border-[#ebebeb] focus:border-[#5862fb]'
              }`}
              data-testid="place-add-url-entry-input"
              id="place-add-naver-url-input"
              onChange={(event) => {
                setRawUrl(event.target.value)
                if (urlFieldError) {
                  setUrlFieldError('')
                }
              }}
              placeholder="https://naver.me/"
              type="text"
              value={rawUrl}
            />
            {urlFieldError ? (
              <span
                className="block text-xs text-[#e53935]"
                data-testid="place-add-url-entry-error"
                id="place-add-naver-url-input-error"
              >
                {urlFieldError}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3" data-testid="place-add-url-entry-actions">
            <button
              aria-label={submitState === 'submitting' ? '불러오는 중' : '장소 정보 가져오기'}
              className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#5862fb] px-4 py-2 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="place-add-url-entry-submit-button"
              disabled={isLookupDisabled}
              onClick={() => { void handleLookup() }}
              type="button"
            >
              {submitState === 'submitting' ? (
                <span
                  aria-hidden="true"
                  className="ui-spinner ui-spinner-xs"
                  data-testid="place-add-url-entry-submit-spinner"
                />
              ) : '장소 정보 가져오기'}
            </button>
            <button
              className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-[#5862fb] bg-white px-4 py-2 text-base font-semibold text-[#5862fb] transition"
              data-testid="place-add-direct-entry-button"
              onClick={() => onContinueToManual?.()}
              type="button"
            >
              직접 입력하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const PlaceAddForm = ({
  onClose,
  prefill,
}: Pick<PlaceAddPanelProps, 'onClose' | 'prefill'>) => {
  const { csrfHeaderName, csrfToken } = useAuth()
  const { isDesktop } = useViewportMode()
  const applyRegistrationResult = useAppShellStore((state) => state.applyRegistrationResult)
  const inputClasses = `h-12 py-3 ${BASE_TEXT_FIELD_CLASSES}`
  const submitButtonSizeClasses = 'h-12 py-3'
  const textareaClasses = `h-[144px] min-h-[144px] resize-none overflow-y-auto py-3 ${BASE_TEXT_FIELD_CLASSES}`
  const scrollRegionClassName = isDesktop
    ? 'flex-1 min-h-0 overflow-auto px-6 pb-4'
    : 'flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-4'
  const mobileScrollRegionStyle: CSSProperties | undefined = isDesktop
    ? undefined
    : {
        paddingBottom: 'calc(16px + var(--nurimap-safe-area-bottom, 0px))',
        scrollPaddingBottom: 'calc(24px + var(--nurimap-safe-area-bottom, 0px))',
      }

  const [draft, setDraft] = useState<RegistrationDraft>(() => createInitialDraft(prefill ?? undefined))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitState, setSubmitState] = useState<PlaceSubmitState>('idle')
  const hasRequiredFields = hasCompletedRequiredFields(draft)

  const updateDraft = (patch: Partial<RegistrationDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setFieldErrors((current) => {
      const next = { ...current }
      if ('name' in patch) delete next.name
      if ('road_address' in patch) delete next.road_address
      if ('place_type' in patch || 'zeropay_status' in patch || 'rating_score' in patch || 'review_content' in patch) {
        delete next.form
      }
      return next
    })
  }

  const handleClose = () => {
    onClose()
  }

  const handleSubmit = async () => {
    if (submitState === 'submitting') return

    const requiredFieldErrors = buildRequiredFieldErrors(draft)
    if (Object.keys(requiredFieldErrors).length > 0) {
      setFieldErrors(requiredFieldErrors)
      setSubmitState('error')
      return
    }

    setSubmitState('submitting')
    setFieldErrors({})

    try {
      const submissionDraft = {
        name: draft.name.trim(),
        roadAddress: draft.road_address.trim(),
        placeType: draft.place_type,
        zeropayStatus: draft.zeropay_status,
        ratingScore: draft.rating_score,
        reviewContent: draft.review_content,
      }

      const createSubmission = async () => {
        const response = await fetch('/api/place-submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfHeaderName && csrfToken ? { [csrfHeaderName]: csrfToken } : {}),
          },
          body: JSON.stringify(submissionDraft),
        })

        return {
          response,
          payload: (await response.json()) as PlaceEntryResponse,
        }
      }

      const confirmSubmission = async (submissionId: string) => {
        const response = await fetch(`/api/place-submissions/${encodeURIComponent(submissionId)}/confirmations`, {
          method: 'POST',
          headers: {
            ...(csrfHeaderName && csrfToken ? { [csrfHeaderName]: csrfToken } : {}),
          },
        })

        return {
          response,
          payload: (await response.json()) as PlaceEntryResponse,
        }
      }

      let { response, payload } = await createSubmission()

      if ('status' in payload && payload.status === 'confirm_required') {
        const confirmed = window.confirm(formatDialogMessage(payload.confirmMessage))
        if (!confirmed) {
          setSubmitState('idle')
          return
        }

        const confirmedResult = await confirmSubmission(payload.submissionId ?? encodePlaceSubmissionId(submissionDraft))
        response = confirmedResult.response
        payload = confirmedResult.payload
      }

      if ('status' in payload && payload.status === 'error') {
        const message = payload.error.message || GENERIC_SUBMIT_ERROR_MESSAGE
        window.alert(formatDialogMessage(message))
        setFieldErrors({ road_address: message })
        setSubmitState('error')
        return
      }

      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null && 'error' in payload && payload.error?.message
            ? payload.error.message
            : GENERIC_SUBMIT_ERROR_MESSAGE
        window.alert(formatDialogMessage(message))
        setFieldErrors({ form: message })
        setSubmitState('error')
        return
      }

      if ('status' in payload && (payload.status === 'created' || payload.status === 'merged' || payload.status === 'updated')) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        applyRegistrationResult(payload)
        const currentState = readHistoryStateRecord(window.history.state)
        const nextDetailState: Record<string, unknown> = {}
        const detailOriginNavigationState = currentState[PLACE_ADD_ORIGIN_NAVIGATION_STATE_FIELD]
        const mobileHistorySessionKey = currentState[MOBILE_HISTORY_SESSION_KEY_FIELD]

        if (isBrowseNavigationState(detailOriginNavigationState) && typeof mobileHistorySessionKey === 'string') {
          nextDetailState[MOBILE_DETAIL_ORIGIN_FIELD] = detailOriginNavigationState
          nextDetailState[MOBILE_DETAIL_ORIGIN_SESSION_KEY_FIELD] = mobileHistorySessionKey
        }

        window.history.pushState(nextDetailState, '', getDetailRoutePath(payload.place.id))
        window.dispatchEvent(new PopStateEvent('popstate'))
        window.alert(formatDialogMessage(payload.message))
        setSubmitState('idle')
        return
      }

      window.alert(formatDialogMessage(GENERIC_SUBMIT_ERROR_MESSAGE))
      setFieldErrors({ form: GENERIC_SUBMIT_ERROR_MESSAGE })
      setSubmitState('error')
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : GENERIC_SUBMIT_ERROR_MESSAGE
      window.alert(formatDialogMessage(message))
      setFieldErrors({ form: message })
      setSubmitState('error')
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="place-add-form">
      <div className="sticky top-0 z-10 h-14 bg-white" data-testid="place-add-header">
        <div className="relative h-full">
          <button
            aria-label="뒤로가기"
            className="place-add-back-button absolute left-6 top-6 inline-flex h-6 w-6 cursor-pointer items-center justify-center"
            data-testid="place-add-back-button"
            onClick={handleClose}
            type="button"
          >
            <BackArrowIcon />
          </button>
        </div>
      </div>
      <h2 className="sr-only">직접 장소 등록</h2>

      <div className={scrollRegionClassName} style={mobileScrollRegionStyle}>
        <div className="mt-6" data-testid="place-add-form-content">
          <div className="space-y-6" data-testid="place-add-form-fields">
            <div className="w-full" data-testid="place-name-field">
              <label className="block" htmlFor="place-name-input">
                <span className="block text-xs font-medium leading-none text-[#1f1f1f]">이름</span>
              </label>
              <input
                aria-label="이름"
                className={`${inputClasses} mt-2 ${fieldErrors.name ? 'border-error focus:border-error' : ''}`}
                id="place-name-input"
                onChange={(event) => updateDraft({ name: event.target.value })}
                placeholder="누리미디어"
                type="text"
                value={draft.name}
              />
              {fieldErrors.name ? <span className="mt-2 block text-xs text-[#e53935]">{fieldErrors.name}</span> : null}
            </div>

            <div className="w-full" data-testid="place-address-field">
              <label className="block" htmlFor="place-address-input">
                <span className="block text-xs font-medium leading-none text-[#1f1f1f]">주소</span>
              </label>
              <input
                aria-label="주소"
                className={`${inputClasses} mt-2 ${fieldErrors.road_address ? 'border-error focus:border-error' : ''}`}
                id="place-address-input"
                onChange={(event) => updateDraft({ road_address: event.target.value })}
                placeholder="서울 마포구 양화로19길 22-16"
                type="text"
                value={draft.road_address}
              />
              {fieldErrors.road_address ? <span className="mt-2 block text-xs text-[#e53935]">{fieldErrors.road_address}</span> : null}
            </div>

            <SegmentedField label="장소 구분" onChange={(place_type) => updateDraft({ place_type })} options={PLACE_TYPE_OPTIONS} testId="place-type-field" value={draft.place_type} />
            <SegmentedField label="제로페이" onChange={(zeropay_status) => updateDraft({ zeropay_status })} options={ZEROPAY_OPTIONS} testId="zeropay-field" value={draft.zeropay_status} />
            <StarRatingField isDesktop={isDesktop} rating={draft.rating_score} onChange={(rating_score) => updateDraft({ rating_score })} />

            <div className="w-full" data-testid="review-field">
              <label className="block" htmlFor="place-review-input">
                <span className="block text-xs font-medium leading-none text-[#1f1f1f]">후기(선택)</span>
              </label>
              <textarea
                className={`${textareaClasses} mt-2`}
                data-testid="review-content-input"
                id="place-review-input"
                onChange={(event) => {
                  const nextReviewContent = clampReviewContent(event.target.value)
                  event.currentTarget.value = nextReviewContent
                  updateDraft({ review_content: nextReviewContent })
                }}
                maxLength={REVIEW_LIMIT}
                value={draft.review_content}
              />
            </div>
          </div>

          {fieldErrors.form ? <p className="mt-4 text-sm text-[#e53935]">{fieldErrors.form}</p> : null}

          <button
            aria-label={submitState === 'submitting' ? '등록 중' : '등록'}
            className={`place-submit-button mt-6 inline-flex ${submitButtonSizeClasses} w-full items-center justify-center rounded-xl bg-[#5862fb] text-base font-semibold text-white transition hover:bg-[#4953f1] disabled:cursor-not-allowed disabled:opacity-50`}
            data-required-fields={hasRequiredFields ? 'complete' : 'incomplete'}
            data-testid="place-submit-button"
            disabled={submitState === 'submitting'}
            onClick={() => { void handleSubmit() }}
            type="button"
          >
            {submitState === 'submitting' ? (
              <span aria-hidden="true" className="ui-spinner ui-spinner-xs" data-testid="place-submit-spinner" />
            ) : '등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

export const DesktopPlaceAddPanel = ({
  onClose,
  onContinueToManual,
  prefill,
  step = 'manual_form',
}: PlaceAddPanelProps) => (
  <div className="flex-1 overflow-hidden" data-testid="desktop-place-add-panel">
    {step === 'url_entry' ? (
      <PlaceAddUrlEntry onClose={onClose} onContinueToManual={onContinueToManual} />
    ) : (
      <PlaceAddForm key={buildManualFormKey(prefill)} onClose={onClose} prefill={prefill} />
    )}
  </div>
)

export const MobilePlaceAddPage = ({
  onClose,
  onContinueToManual,
  prefill,
  step = 'manual_form',
}: PlaceAddPanelProps) => (
  <section className="flex h-full min-h-0 flex-col overflow-hidden bg-white" data-testid="mobile-place-add-page">
    <div className="flex-1 min-h-0 overflow-hidden">
      {step === 'url_entry' ? (
        <PlaceAddUrlEntry onClose={onClose} onContinueToManual={onContinueToManual} />
      ) : (
        <PlaceAddForm key={buildManualFormKey(prefill)} onClose={onClose} prefill={prefill} />
      )}
    </div>
  </section>
)
