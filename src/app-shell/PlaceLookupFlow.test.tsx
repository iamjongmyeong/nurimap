import { act, render, screen, waitFor } from '@testing-library/react'
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

describe('Plan 05 direct place entry shell flow', () => {
  beforeEach(() => {
    resetAppShellStore()
    globalThis.fetch = originalFetch
  })

  it('replaces the desktop list area with the direct-entry form', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('place-list-ready')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '장소 추가' }))

    expect(screen.getByTestId('desktop-sidebar')).toContainElement(screen.getByTestId('desktop-place-add-panel'))
    expect(screen.getByRole('heading', { name: '직접 장소 등록' })).toBeInTheDocument()
    expect(screen.queryByTestId('place-list-ready')).not.toBeInTheDocument()
  })

  it('renders the direct-entry fields in source-of-truth order', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))

    const orderedFields = [
      screen.getByTestId('place-name-field'),
      screen.getByTestId('place-address-field'),
      screen.getByTestId('place-type-field'),
      screen.getByTestId('zeropay-field'),
      screen.getByTestId('rating-field'),
      screen.getByTestId('review-field'),
      screen.getByTestId('place-submit-button'),
    ]

    orderedFields.reduce((previous, current) => {
      expect(previous.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      return current
    })
  })

  it('uses the mobile list surface for direct entry and hides floating actions while open', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('mobile-floating-actions')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '장소 추가' }))

    expect(screen.getByTestId('mobile-place-add-page')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-floating-actions')).not.toBeInTheDocument()
  })

  it('submits the direct-entry draft on register and shows the submit loading state', async () => {
    let resolveResponse!: (response: Response) => void
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    )
    globalThis.fetch = fetchMock as typeof fetch

    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await user.type(screen.getByLabelText('이름'), '등록 테스트 장소')
    await user.type(screen.getByLabelText('주소'), '서울 마포구 등록로 1')
    const submitButton = screen.getByTestId('place-submit-button')
    const submitPromise = user.click(submitButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('place-submit-loading')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    const firstCall = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit | undefined] | undefined
    expect(firstCall).toBeDefined()
    const [requestUrl, requestInit] = firstCall ?? ['/api/place-entry', undefined]
    expect(requestUrl).toBe('/api/place-entry')
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      name: '등록 테스트 장소',
      roadAddress: '서울 마포구 등록로 1',
    })

    resolveResponse(mockPlaceEntrySuccess())

    await submitPromise
    await waitFor(() => {
      expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('등록 테스트 장소')
    })
  })

  it('prevents duplicate direct-entry submissions while geocoding is in progress', async () => {
    let resolveResponse!: (response: Response) => void
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    )
    globalThis.fetch = fetchMock as typeof fetch

    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await user.type(screen.getByLabelText('이름'), '중복 방지 테스트 장소')
    await user.type(screen.getByLabelText('주소'), '서울 마포구 등록로 1')
    const submitButton = screen.getByTestId('place-submit-button')

    await user.click(submitButton)
    await user.click(submitButton)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(submitButton).toBeDisabled()

    resolveResponse(mockPlaceEntrySuccess({ name: '중복 방지 테스트 장소' }))

    await waitFor(() => {
      expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('중복 방지 테스트 장소')
    })
  })
})
