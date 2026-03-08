import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { resetAppShellStore } from './appShellStore'

const originalFetch = globalThis.fetch

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

const mockLookupSuccess = (overrides: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      status: 'success',
      data: {
        naver_place_id: '123456789',
        canonical_url: 'https://map.naver.com/p/entry/place/123456789',
        name: '등록 테스트 장소',
        road_address: '서울 마포구 등록로 1',
        land_lot_address: '서울 마포구 등록동 1-1',
        representative_address: '서울 마포구 등록로 1',
        latitude: 37.558721,
        longitude: 126.92444,
        coordinate_source: 'naver',
        ...overrides,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

describe('Plan 06 place registration flow', () => {
  beforeEach(() => {
    resetAppShellStore()
    globalThis.fetch = originalFetch
  })

  it('uses the same screen for URL lookup and registration step', async () => {
    globalThis.fetch = vi.fn(async () => mockLookupSuccess()) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))

    expect(await screen.findByTestId('place-registration-step')).toBeInTheDocument()
    expect(screen.getByTestId('place-lookup-summary')).toHaveTextContent('등록 테스트 장소')
  })

  it('defaults the rating to 5 stars', async () => {
    globalThis.fetch = vi.fn(async () => mockLookupSuccess()) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))

    expect(await screen.findByTestId('rating-star-5')).toHaveClass('btn-warning')
  })

  it('fails when the review length exceeds 500 characters', async () => {
    globalThis.fetch = vi.fn(async () => mockLookupSuccess()) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))
    fireEvent.change(screen.getByTestId('review-content-input'), { target: { value: 'a'.repeat(501) } })
    await user.click(await screen.findByTestId('place-submit-button'))

    expect(screen.getByText('리뷰는 500자 이하로 입력해주세요.')).toBeInTheDocument()
  })

  it('blocks registration when coordinates are unavailable', async () => {
    globalThis.fetch = vi.fn(async () => mockLookupSuccess({ latitude: undefined, longitude: undefined })) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))
    await user.click(await screen.findByTestId('place-submit-button'))

    expect(screen.getByText('좌표를 확인한 뒤에만 등록할 수 있어요.')).toBeInTheDocument()
  })

  it('creates the initial review for a newly registered place', async () => {
    globalThis.fetch = vi.fn(async () => mockLookupSuccess()) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))
    await user.type(screen.getByTestId('review-content-input'), '새 장소 첫 리뷰')
    await user.click(await screen.findByTestId('place-submit-button'))

    expect(await screen.findByTestId('detail-my-review')).toHaveTextContent('새 장소 첫 리뷰')
    expect(screen.getByTestId('registration-message')).toHaveTextContent('장소를 추가했어요.')
  })

  it('shows the duplicate review modal when my review already exists', async () => {
    globalThis.fetch = vi.fn(async () =>
      mockLookupSuccess({
        naver_place_id: '10001',
        canonical_url: 'https://map.naver.com/p/entry/place/10001',
        name: '누리 식당',
      }),
    ) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/10001')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))

    expect(await screen.findByTestId('existing-review-modal')).toBeInTheDocument()
  })

  it('opens the existing place detail when the duplicate review modal CTA is clicked', async () => {
    globalThis.fetch = vi.fn(async () =>
      mockLookupSuccess({
        naver_place_id: '10001',
        canonical_url: 'https://map.naver.com/p/entry/place/10001',
        name: '누리 식당',
      }),
    ) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/10001')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))
    await user.click(await screen.findByRole('button', { name: '장소 상세 보기' }))

    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('누리 식당')
  })

  it('closes the place add screen when the duplicate review modal close button is clicked', async () => {
    globalThis.fetch = vi.fn(async () =>
      mockLookupSuccess({
        naver_place_id: '10001',
        canonical_url: 'https://map.naver.com/p/entry/place/10001',
        name: '누리 식당',
      }),
    ) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/10001')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))
    await user.click(await screen.findByRole('button', { name: '닫기' }))

    expect(screen.queryByTestId('desktop-place-add-panel')).not.toBeInTheDocument()
  })

  it('shows the submitting state and disables the submit button while saving', async () => {
    globalThis.fetch = vi.fn(async () => mockLookupSuccess()) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))
    await user.type(screen.getByTestId('review-content-input'), '저장 중 테스트')
    const submitButton = screen.getByTestId('place-submit-button')
    const clickPromise = user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('place-submit-loading')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    await clickPromise
    await screen.findByTestId('desktop-detail-panel')
  })

  it('keeps the entered values after a save failure', async () => {
    globalThis.fetch = vi.fn(async () => mockLookupSuccess({ name: '저장 실패 장소' })) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))
    await user.selectOptions(screen.getByTestId('place-type-select'), 'cafe')
    await user.selectOptions(screen.getByTestId('zeropay-status-select'), 'available')
    await user.type(screen.getByTestId('review-content-input'), '입력 유지 테스트')
    await user.click(await screen.findByTestId('place-submit-button'))

    expect(await screen.findByText('등록을 저장하지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
    expect(screen.getByTestId('place-type-select')).toHaveValue('cafe')
    expect(screen.getByTestId('zeropay-status-select')).toHaveValue('available')
    expect(screen.getByTestId('review-content-input')).toHaveValue('입력 유지 테스트')
  })

  it('updates the map and list and opens the detail after a successful registration', async () => {
    globalThis.fetch = vi.fn(async () => mockLookupSuccess()) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    expect(screen.queryByTestId('place-list-item-place-123456789')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))
    await user.type(screen.getByTestId('review-content-input'), '목록 반영 테스트')
    await user.click(await screen.findByTestId('place-submit-button'))

    expect(await screen.findByTestId('place-list-item-place-123456789')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('등록 테스트 장소')
    expect(screen.getByTestId('map-marker-place-123456789')).toBeInTheDocument()
  })

  it('merges an existing place and shows the merge message', async () => {
    globalThis.fetch = vi.fn(async () =>
      mockLookupSuccess({
        naver_place_id: '10002',
        canonical_url: 'https://map.naver.com/p/entry/place/10002',
        name: '양화로 카페 리프레시',
      }),
    ) as typeof fetch
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await screen.findByLabelText('네이버 지도 URL')
    await user.type(await screen.findByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/10002')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))
    await user.type(screen.getByTestId('review-content-input'), '병합 테스트 리뷰')
    await user.click(await screen.findByTestId('place-submit-button'))

    expect(await screen.findByTestId('registration-message')).toHaveTextContent('기존 장소에 정보를 합쳤어요.')
    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('양화로 카페 리프레시')
  })
})
