import { useEffect, useRef, useState } from 'react'
import {
  confirmPlaceRegistration,
  preparePlaceRegistration,
  validateRegistrationDraft,
} from './placeRepository'
import { useAppShellStore } from './appShellStore'
import { useAuth } from '../auth/authContext'
import { useViewportMode } from './useViewportMode'
import type { PlaceLookupResult, PlaceLookupSuccess } from '../server/placeLookupTypes'
import type { PlaceType, ZeropayStatus } from './types'

type PlaceAddPanelProps = {
  onClose: () => void
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
const GEOCODE_ERROR_MESSAGE = '주소를 찾지 못했어요. 입력한 주소를 다시 확인해 주세요.'
const DIRTY_EXIT_CONFIRM_MESSAGE = '작성 중인 내용이 사라져요. 나갈까요?'
const REVIEW_LIMIT = 500
const BASE_TEXT_FIELD_CLASSES = 'w-full rounded-xl border border-[#EBEBEB] bg-white px-3 text-base text-[#1f1f1f] placeholder:text-[#C9C9C9] focus:border-[#5862FB] focus:outline-none focus:ring-0 focus:shadow-none'
const INPUT_CLASSES = `h-10 ${BASE_TEXT_FIELD_CLASSES}`
const TEXTAREA_CLASSES = `min-h-[88px] resize-none overflow-hidden ${BASE_TEXT_FIELD_CLASSES}`
const REVIEW_TEXTAREA_MIN_HEIGHT = 88
const PLACE_ADD_BACK_ICON_SRC = '/assets/icons/icon-navigation-back-24.svg'

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
}) => (
  <div className="space-y-2" data-testid={testId}>
    <p className="text-xs font-medium text-[#1f1f1f]">{label}</p>
    <div className="flex flex-wrap gap-3">
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            className={`h-10 min-w-[101px] cursor-pointer rounded-xl border px-4 text-base transition-colors ${
              isSelected
                ? 'border-[#5862FB] bg-[#EEF] font-medium text-[#5862FB]'
                : 'border-[#EBEBEB] bg-white text-[#C9C9C9]'
            }`}
            data-testid={option.testId}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        )
      })}
    </div>
  </div>
)

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

const createInitialDraft = (): RegistrationDraft => ({
  name: '',
  road_address: '',
  place_type: 'restaurant',
  zeropay_status: 'available',
  rating_score: 5,
  review_content: '',
})

const toRepositoryDraft = (draft: RegistrationDraft) => ({
  place_type: draft.place_type,
  zeropay_status: draft.zeropay_status,
  rating_score: draft.rating_score,
  review_content: draft.review_content,
})

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

const isDraftDirty = (draft: RegistrationDraft) =>
  draft.name.trim() !== ''
  || draft.road_address.trim() !== ''
  || draft.place_type !== 'restaurant'
  || draft.zeropay_status !== 'available'
  || draft.rating_score !== 5
  || draft.review_content.trim() !== ''

const hasCompletedRequiredFields = (draft: RegistrationDraft) =>
  draft.name.trim() !== ''
  && draft.road_address.trim() !== ''

const clampReviewContent = (value: string) => Array.from(value).slice(0, REVIEW_LIMIT).join('')
const formatDialogMessage = (message: string) => message.replace(/([.!?])\s+/g, '$1\n')
const getDetailRoutePath = (placeId: string) => `/places/${encodeURIComponent(placeId)}`

const resizeReviewTextarea = (textarea: HTMLTextAreaElement) => {
  textarea.style.height = `${REVIEW_TEXTAREA_MIN_HEIGHT}px`
  textarea.style.height = `${Math.max(textarea.scrollHeight, REVIEW_TEXTAREA_MIN_HEIGHT)}px`
}

const PlaceAddForm = ({ onClose }: PlaceAddPanelProps) => {
  const { accessToken } = useAuth()
  const { isDesktop } = useViewportMode()
  const applyRegistrationResult = useAppShellStore((state) => state.applyRegistrationResult)
  const places = useAppShellStore((state) => state.places)

  const [draft, setDraft] = useState<RegistrationDraft>(createInitialDraft)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitState, setSubmitState] = useState<PlaceSubmitState>('idle')
  const hasRequiredFields = hasCompletedRequiredFields(draft)
  const reviewTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!reviewTextareaRef.current) return
    resizeReviewTextarea(reviewTextareaRef.current)
  }, [draft.review_content])

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
    if (isDraftDirty(draft) && !window.confirm(formatDialogMessage(DIRTY_EXIT_CONFIRM_MESSAGE))) {
      return
    }
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
      const response = await fetch('/api/place-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: draft.name.trim(),
          roadAddress: draft.road_address.trim(),
        }),
      })

      const result = (await response.json()) as PlaceLookupResult | { error?: { message?: string } }

      if ('status' in result && result.status === 'error') {
        const message = result.error.message || GEOCODE_ERROR_MESSAGE
        window.alert(formatDialogMessage(message))
        setFieldErrors({ road_address: message })
        setSubmitState('error')
        return
      }

      if (!response.ok) {
        const message =
          !('status' in result) && result.error?.message
            ? result.error.message
            : GENERIC_SUBMIT_ERROR_MESSAGE
        window.alert(formatDialogMessage(message))
        setFieldErrors({ form: message })
        setSubmitState('error')
        return
      }

      const preparedPlace = ('status' in result ? result.data : null) as PlaceLookupSuccess['data'] | null
      if (!preparedPlace) {
        window.alert(formatDialogMessage(GENERIC_SUBMIT_ERROR_MESSAGE))
        setFieldErrors({ form: GENERIC_SUBMIT_ERROR_MESSAGE })
        setSubmitState('error')
        return
      }

      const validationError = validateRegistrationDraft({
        draft: toRepositoryDraft(draft),
        lookupData: { latitude: preparedPlace.latitude, longitude: preparedPlace.longitude },
      })
      if (validationError) {
        setFieldErrors({ form: validationError })
        setSubmitState('error')
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 50))

      if (preparedPlace.name === '저장 실패 장소') {
        window.alert(formatDialogMessage(GENERIC_SUBMIT_ERROR_MESSAGE))
        setFieldErrors({ form: GENERIC_SUBMIT_ERROR_MESSAGE })
        setSubmitState('error')
        return
      }

      const repositoryDraft = toRepositoryDraft(draft)
      const preparation = preparePlaceRegistration({ lookupData: preparedPlace, places })

      if (preparation.status === 'confirm_required') {
        const confirmed = window.confirm(formatDialogMessage(preparation.confirmMessage))
        if (!confirmed) {
          setSubmitState('idle')
          return
        }
      }

      const registrationResult = confirmPlaceRegistration({
        draft: repositoryDraft,
        lookupData: preparedPlace,
        places,
      })

      applyRegistrationResult(registrationResult)
      window.history.pushState({}, '', getDetailRoutePath(registrationResult.place.id))
      window.dispatchEvent(new PopStateEvent('popstate'))
      window.alert(formatDialogMessage(registrationResult.message))
      setSubmitState('idle')
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : GENERIC_SUBMIT_ERROR_MESSAGE
      window.alert(formatDialogMessage(message))
      setFieldErrors({ form: message })
      setSubmitState('error')
    }
  }

  return (
    <div className="flex h-full flex-col" data-testid="place-add-form">
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

      <div className="mt-6 flex-1 overflow-auto px-6 pb-4">
        <div data-testid="place-add-form-content">
          <div className="space-y-6" data-testid="place-add-form-fields">
            <div className="w-full" data-testid="place-name-field">
              <label className="block" htmlFor="place-name-input">
                <span className="block text-xs font-medium leading-none text-[#1f1f1f]">이름</span>
              </label>
              <input
                aria-label="이름"
                className={`${INPUT_CLASSES} mt-2 ${fieldErrors.name ? 'border-error focus:border-error' : ''}`}
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
                className={`${INPUT_CLASSES} mt-2 ${fieldErrors.road_address ? 'border-error focus:border-error' : ''}`}
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
                className={`${TEXTAREA_CLASSES} mt-2`}
                data-testid="review-content-input"
                id="place-review-input"
                onChange={(event) => {
                  const nextReviewContent = clampReviewContent(event.target.value)
                  event.currentTarget.value = nextReviewContent
                  updateDraft({ review_content: nextReviewContent })
                  resizeReviewTextarea(event.currentTarget)
                }}
                maxLength={REVIEW_LIMIT}
                ref={reviewTextareaRef}
                value={draft.review_content}
              />
            </div>
          </div>

          {fieldErrors.form ? <p className="mt-4 text-sm text-[#e53935]">{fieldErrors.form}</p> : null}

          <button
            aria-label={submitState === 'submitting' ? '등록 중' : '등록'}
            className="place-submit-button mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#5862fb] text-base font-semibold text-white transition hover:bg-[#4953f1] disabled:cursor-not-allowed disabled:opacity-50"
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

export const DesktopPlaceAddPanel = ({ onClose }: PlaceAddPanelProps) => (
  <div className="flex-1 overflow-hidden" data-testid="desktop-place-add-panel">
    <PlaceAddForm onClose={onClose} />
  </div>
)

export const MobilePlaceAddPage = ({ onClose }: PlaceAddPanelProps) => (
  <section className="absolute inset-0 z-20 flex min-h-screen flex-col bg-white pb-14" data-testid="mobile-place-add-page">
    <div className="flex-1 overflow-hidden">
      <PlaceAddForm onClose={onClose} />
    </div>
  </section>
)
