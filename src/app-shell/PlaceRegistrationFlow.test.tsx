import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { resetAppShellStore } from './appShellStore'

const originalFetch = globalThis.fetch
const GEOCODE_FAILURE_MESSAGE = '주소를 찾지 못했어요. 입력한 주소를 다시 확인해 주세요.'
const GEOCODE_FAILURE_ALERT_MESSAGE = '주소를 찾지 못했어요.\n입력한 주소를 다시 확인해 주세요.'
const GENERIC_SAVE_FAILURE_ALERT_MESSAGE = '등록하지 못했어요.\n잠시 후 다시 시도해 주세요.'
const DUPLICATE_CONFIRM_MESSAGE = '이미 등록된 장소예요.\n지금 입력한 정보를 이 장소에 반영할까요?'
const OVERWRITE_CONFIRM_MESSAGE = '이미 내가 리뷰를 남긴 장소예요.\n지금 입력한 정보를 반영할까요?'
const DIRTY_CLOSE_MESSAGE = '작성 중인 내용이 사라져요.\n나갈까요?'

const setViewport = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })

  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

const mockPlaceEntrySuccess = (overrides: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      status: 'success',
      data: {
        naver_place_id: 'direct-entry-123456789',
        canonical_url: 'https://map.naver.com/p/search/%EB%93%B1%EB%A1%9D%20%ED%85%8C%EC%8A%A4%ED%8A%B8%20%EC%9E%A5%EC%86%8C',
        name: '등록 테스트 장소',
        road_address: '서울 마포구 등록로 1',
        land_lot_address: null,
        representative_address: '서울 마포구 등록로 1',
        latitude: 37.558721,
        longitude: 126.92444,
        coordinate_source: 'road_address_geocode',
        ...overrides,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

const openDirectEntryForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: '장소 추가' }))
  await screen.findByRole('heading', { name: '직접 장소 등록' })
}

const fillDirectEntryForm = async ({
  address = '서울 마포구 등록로 1',
  name = '등록 테스트 장소',
  user,
}: {
  address?: string
  name?: string
  user: ReturnType<typeof userEvent.setup>
}) => {
  await openDirectEntryForm(user)
  await user.type(screen.getByLabelText('이름'), name)
  await user.type(screen.getByLabelText('주소'), address)
}

describe('Plan 06 place registration flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    resetAppShellStore()
    window.history.replaceState({}, '', '/')
    globalThis.fetch = originalFetch
  })

  it('defaults the rating to 5 stars', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await openDirectEntryForm(user)

    expect(screen.getByTestId('rating-star-5')).toHaveClass('text-red-500')
    expect(screen.getByTestId('rating-star-1')).toHaveClass('text-red-500')
  })

  it('updates the desktop rating when hovering a lower star', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await openDirectEntryForm(user)

    expect(screen.getByTestId('rating-star-5')).toHaveClass('text-red-500')

    await user.hover(screen.getByTestId('rating-star-4'))

    expect(screen.getByTestId('rating-star-4')).toHaveClass('text-red-500')
    expect(screen.getByTestId('rating-star-5')).toHaveClass('text-slate-300')
  })

  it('keeps mobile rating click-only even if hover is fired in tests', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await openDirectEntryForm(user)

    expect(screen.getByTestId('rating-star-5')).toHaveClass('text-red-500')

    await user.hover(screen.getByTestId('rating-star-4'))

    expect(screen.getByTestId('rating-star-5')).toHaveClass('text-red-500')

    await user.click(screen.getByTestId('rating-star-4'))

    expect(screen.getByTestId('rating-star-4')).toHaveClass('text-red-500')
    expect(screen.getByTestId('rating-star-5')).toHaveClass('text-slate-300')
  })

  it('applies the updated place-add field styles and back-only header affordance', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await openDirectEntryForm(user)

    const backButton = screen.getByTestId('place-add-back-button')
    expect(backButton).toHaveAccessibleName('뒤로가기')
    expect(backButton).toHaveClass('place-add-back-button', 'h-6', 'w-6')

    const nameInput = screen.getByLabelText('이름')
    const addressInput = screen.getByLabelText('주소')
    const reviewInput = screen.getByTestId('review-content-input')
    const placeTypeCafeButton = screen.getByTestId('place-type-option-cafe')
    const zeropayUnavailableButton = screen.getByTestId('zeropay-option-unavailable')
    const zeropayNeedsVerificationButton = screen.getByTestId('zeropay-option-needs-verification')

    expect(screen.getByTestId('desktop-sidebar')).toHaveClass('place-add-surface')
    expect(nameInput).toHaveClass('border-[#EBEBEB]', 'focus:border-[#5862FB]')
    expect(nameInput).toHaveClass('text-base', 'placeholder:text-[#C9C9C9]')
    expect(addressInput).toHaveClass('border-[#EBEBEB]', 'focus:border-[#5862FB]')
    expect(addressInput).toHaveClass('text-base', 'placeholder:text-[#C9C9C9]')
    expect(screen.getByTestId('place-type-option-restaurant')).toHaveClass('cursor-pointer')
    expect(screen.getByTestId('place-type-field')).toHaveClass('space-y-2')
    expect(placeTypeCafeButton).toHaveClass('text-base', 'text-[#C9C9C9]')
    expect(screen.getByTestId('zeropay-option-available')).toHaveClass('cursor-pointer')
    expect(screen.getByTestId('zeropay-field')).toHaveClass('space-y-2')
    expect(zeropayUnavailableButton).toHaveClass('text-base', 'text-[#C9C9C9]')
    expect(zeropayNeedsVerificationButton).toHaveClass('text-base', 'text-[#C9C9C9]')
    expect(screen.getByTestId('rating-field')).toHaveClass('space-y-3')
    expect(screen.getByTestId('rating-star-3')).toHaveClass('cursor-pointer', 'hover:scale-110')
    expect(reviewInput).toHaveClass('w-full', 'min-h-[88px]', 'resize-none')
    expect(screen.queryByText('0 / 500')).not.toBeInTheDocument()
    const submitButton = screen.getByTestId('place-submit-button')
    expect(submitButton).toHaveClass('mt-6')
    expect(submitButton).toHaveAttribute('data-required-fields', 'incomplete')

    await user.type(nameInput, '누리미디어')
    await user.type(addressInput, '서울 마포구 양화로19길 22-16')

    expect(submitButton).toHaveAttribute('data-required-fields', 'complete')
  })

  it('grows the review textarea height when the entered content exceeds the minimum height', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await openDirectEntryForm(user)

    const reviewInput = screen.getByTestId('review-content-input') as HTMLTextAreaElement

    Object.defineProperty(reviewInput, 'scrollHeight', {
      configurable: true,
      value: 164,
    })

    await user.type(reviewInput, '첫 줄\\n둘째 줄\\n셋째 줄\\n넷째 줄\\n다섯째 줄\\n여섯째 줄')

    expect(reviewInput.style.height).toBe('164px')
  })

  it('clamps pasted review content to 500 characters and discards the overflow', async () => {
    globalThis.fetch = vi.fn(async () => mockPlaceEntrySuccess()) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await fillDirectEntryForm({ user })
    const pastedReview = 'a'.repeat(501)
    fireEvent.change(screen.getByTestId('review-content-input'), { target: { value: pastedReview } })

    expect(screen.getByTestId('review-content-input')).toHaveValue('a'.repeat(500))

    await user.click(screen.getByTestId('place-submit-button'))

    expect(screen.queryByText('리뷰는 500자 이하로 입력해주세요.')).not.toBeInTheDocument()
    expect(await screen.findByTestId('detail-review-list')).toHaveTextContent('a'.repeat(500))
    expect(screen.getByTestId('detail-meta-rating')).toHaveTextContent('5.0 (1)')
  })

  it('shows browser alert plus inline address error and keeps values on geocode failure', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: 'error',
          error: {
            code: 'coordinates_unavailable',
            message: GEOCODE_FAILURE_MESSAGE,
          },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await fillDirectEntryForm({ user })
    await user.click(screen.getByTestId('place-submit-button'))

    expect(alertSpy).toHaveBeenCalledWith(GEOCODE_FAILURE_ALERT_MESSAGE)
    expect(screen.getByText(GEOCODE_FAILURE_MESSAGE)).toBeInTheDocument()
    expect(screen.getByLabelText('이름')).toHaveValue('등록 테스트 장소')
    expect(screen.getByLabelText('주소')).toHaveValue('서울 마포구 등록로 1')
  })

  it('creates the initial review for a newly registered place', async () => {
    globalThis.fetch = vi.fn(async () => mockPlaceEntrySuccess()) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await fillDirectEntryForm({ user })
    await user.type(screen.getByTestId('review-content-input'), '새 장소 첫 리뷰')
    await user.click(screen.getByTestId('place-submit-button'))

    expect(await screen.findByTestId('detail-review-list')).toHaveTextContent('새 장소 첫 리뷰')
    expect(window.location.pathname).toBe('/places/place-direct-entry-123456789')
    expect(screen.getByTestId('detail-meta-rating')).toHaveTextContent('5.0 (1)')
    expect(window.alert).toHaveBeenCalledWith('장소를 추가했어요.')
    expect(screen.queryByTestId('registration-message')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-my-review')).not.toBeInTheDocument()
  })

  it('shows one browser confirm and merges the existing place when confirmed', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    globalThis.fetch = vi.fn(async () =>
      mockPlaceEntrySuccess({
        naver_place_id: '10002',
        canonical_url: 'https://map.naver.com/p/entry/place/10002',
        name: '양화로 카페 리프레시',
        road_address: '서울 마포구 양화로19길 20 2층',
        representative_address: '서울 마포구 양화로19길 20 2층',
      }),
    ) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await fillDirectEntryForm({ address: '서울 마포구 양화로19길 20 2층', name: '양화로 카페 리프레시', user })
    await user.type(screen.getByTestId('review-content-input'), '병합 테스트 리뷰')
    await user.click(screen.getByTestId('place-submit-button'))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1)
    })
    expect(confirmSpy).toHaveBeenCalledWith(DUPLICATE_CONFIRM_MESSAGE)
    expect(await screen.findByTestId('desktop-detail-panel')).toHaveTextContent('양화로 카페 리프레시')
    expect(window.location.pathname).toBe('/places/place-cafe-1')
    expect(screen.getByTestId('detail-review-list')).toHaveTextContent('병합 테스트 리뷰')
    expect(screen.getByTestId('detail-meta-rating')).toHaveTextContent('4.4 (9)')
    expect(screen.getByTestId('detail-zeropay-indicator')).toBeInTheDocument()
    expect(window.alert).toHaveBeenCalledWith('기존 장소에 정보를 합쳤어요.')
    expect(screen.queryByTestId('registration-message')).not.toBeInTheDocument()
  })

  it('allows overwrite through the same confirm and preserves old review text when new review is blank', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    globalThis.fetch = vi.fn(async () =>
      mockPlaceEntrySuccess({
        naver_place_id: '10001',
        canonical_url: 'https://map.naver.com/p/entry/place/10001',
        name: '누리 식당',
        road_address: '서울 마포구 양화로19길 22-16 1층',
        representative_address: '서울 마포구 양화로19길 22-16 1층',
      }),
    ) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await fillDirectEntryForm({ address: '서울 마포구 양화로19길 22-16 1층', name: '누리 식당', user })
    await user.click(screen.getByTestId('rating-star-3'))
    await user.click(screen.getByTestId('place-submit-button'))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1)
    })
    expect(confirmSpy).toHaveBeenCalledWith(OVERWRITE_CONFIRM_MESSAGE)
    expect(await screen.findByTestId('desktop-detail-panel')).toHaveTextContent('누리 식당')
    expect(window.location.pathname).toBe('/places/place-restaurant-1')
    expect(screen.getByTestId('detail-review-list')).toHaveTextContent('점심 모임으로 가기 좋은 식당이에요.')
    expect(screen.getByTestId('detail-review-list')).toHaveTextContent('3.0')
    expect(screen.getByTestId('detail-meta-rating')).toHaveTextContent('4.5 (12)')
    expect(window.alert).toHaveBeenCalledWith('기존 장소에 정보를 반영했어요.')
    expect(screen.queryByTestId('registration-message')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-my-rating-status')).not.toBeInTheDocument()
  })

  it('keeps form values and stays on screen when duplicate confirm is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    globalThis.fetch = vi.fn(async () =>
      mockPlaceEntrySuccess({
        naver_place_id: '10002',
        canonical_url: 'https://map.naver.com/p/entry/place/10002',
        name: '양화로 카페 리프레시',
        road_address: '서울 마포구 양화로19길 20 2층',
        representative_address: '서울 마포구 양화로19길 20 2층',
      }),
    ) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await fillDirectEntryForm({ address: '서울 마포구 양화로19길 20 2층', name: '양화로 카페 리프레시', user })
    await user.type(screen.getByTestId('review-content-input'), '취소 후 유지')
    await user.click(screen.getByTestId('place-submit-button'))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1)
    })
    expect(confirmSpy).toHaveBeenCalledWith(DUPLICATE_CONFIRM_MESSAGE)
    expect(screen.getByTestId('desktop-place-add-panel')).toBeInTheDocument()
    expect(screen.getByLabelText('이름')).toHaveValue('양화로 카페 리프레시')
    expect(screen.getByLabelText('주소')).toHaveValue('서울 마포구 양화로19길 20 2층')
    expect(screen.getByTestId('review-content-input')).toHaveValue('취소 후 유지')
  })

  it('shows the dirty close confirm and stays open when closing is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await openDirectEntryForm(user)
    await user.type(screen.getByLabelText('이름'), '작성 중인 장소')
    await user.click(screen.getByRole('button', { name: '뒤로가기' }))

    expect(confirmSpy).toHaveBeenCalledWith(DIRTY_CLOSE_MESSAGE)
    expect(screen.getByTestId('desktop-place-add-panel')).toBeInTheDocument()
    expect(screen.getByLabelText('이름')).toHaveValue('작성 중인 장소')
  })

  it('shows the submitting state and disables the submit button while saving', async () => {
    let resolveResponse!: (response: Response) => void
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    ) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await fillDirectEntryForm({ user })
    await user.type(screen.getByTestId('review-content-input'), '저장 중 테스트')
    const submitButton = screen.getByTestId('place-submit-button')
    const clickPromise = user.click(submitButton)

    await waitFor(() => {
      expect(submitButton).not.toHaveTextContent('등록 중')
      expect(submitButton).toHaveAccessibleName('등록 중')
      expect(screen.getByTestId('place-submit-spinner')).toBeInTheDocument()
      expect(screen.queryByTestId('place-submit-loading')).not.toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    resolveResponse(mockPlaceEntrySuccess())

    await clickPromise
    await screen.findByTestId('desktop-detail-panel')
  })

  it('shows only a spinner while the request is in progress', async () => {
    globalThis.fetch = vi.fn(() => new Promise<Response>(() => {})) as typeof fetch
    setViewport(1280)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByRole('heading', { name: '직접 장소 등록' })
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '등록 테스트 장소' } })
    fireEvent.change(screen.getByLabelText('주소'), { target: { value: '서울 마포구 등록로 1' } })

    const submitButton = screen.getByTestId('place-submit-button')
    fireEvent.click(submitButton)

    expect(submitButton).not.toHaveTextContent('등록 중')
    expect(submitButton).toHaveAccessibleName('등록 중')
    expect(screen.getByTestId('place-submit-spinner')).toBeInTheDocument()
  })

  it('keeps the entered values after a save failure', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    globalThis.fetch = vi.fn(async () => mockPlaceEntrySuccess({ name: '저장 실패 장소' })) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await fillDirectEntryForm({ user })
    await user.click(screen.getByTestId('place-type-option-cafe'))
    await user.click(screen.getByTestId('zeropay-option-available'))
    await user.type(screen.getByTestId('review-content-input'), '입력 유지 테스트')
    await user.click(screen.getByTestId('place-submit-button'))

    expect(await screen.findByText('등록하지 못했어요. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
    expect(alertSpy).toHaveBeenCalledWith(GENERIC_SAVE_FAILURE_ALERT_MESSAGE)
    expect(screen.getByLabelText('이름')).toHaveValue('등록 테스트 장소')
    expect(screen.getByLabelText('주소')).toHaveValue('서울 마포구 등록로 1')
    expect(screen.getByTestId('review-content-input')).toHaveValue('입력 유지 테스트')
  })

  it('updates the map and list and opens the detail after a successful registration', async () => {
    globalThis.fetch = vi.fn(async () => mockPlaceEntrySuccess()) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByTestId('place-list-item-place-direct-entry-123456789')).not.toBeInTheDocument()

    await fillDirectEntryForm({ user })
    await user.type(screen.getByTestId('review-content-input'), '목록 반영 테스트')
    await user.click(screen.getByTestId('place-submit-button'))

    expect(await screen.findByTestId('desktop-detail-panel')).toHaveTextContent('등록 테스트 장소')
    expect(screen.getByTestId('map-marker-place-direct-entry-123456789')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '목록으로 돌아가기' }))

    const listItem = await screen.findByTestId('place-list-item-place-direct-entry-123456789')
    expect(listItem).toHaveTextContent('등록 테스트 장소')
    expect(listItem).toHaveTextContent('리뷰')
    expect(listItem).toHaveTextContent('1')
  })
})
