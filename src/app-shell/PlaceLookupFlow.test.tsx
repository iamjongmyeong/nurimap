import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { MOCK_PLACES } from './mockPlaces'
import { resetAppShellStore } from './appShellStore'

const originalFetch = globalThis.fetch

const cloneMockPlace = (placeId: string) => {
  const matched = MOCK_PLACES.find((place) => place.id === placeId)
  if (!matched) return null
  return {
    ...matched,
    my_review: matched.my_review ? { ...matched.my_review } : null,
    reviews: matched.reviews.map((review) => ({ ...review })),
  }
}

const cloneMockPlaces = () =>
  MOCK_PLACES.map((place) => ({
    ...place,
    my_review: place.my_review ? { ...place.my_review } : null,
    reviews: place.reviews.map((review) => ({ ...review })),
  }))

const getPlaceIdFromDetailUrl = (url: string) => {
  const match = url.match(/^\/api\/places\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

const buildCreatedPlacePayload = (body: Record<string, unknown>) => {
  const reviewContent = typeof body.reviewContent === 'string' ? body.reviewContent : ''
  const ratingScore = typeof body.ratingScore === 'number' ? body.ratingScore : 5
  const name = typeof body.name === 'string' ? body.name : '등록 테스트 장소'
  const roadAddress = typeof body.roadAddress === 'string' ? body.roadAddress : '서울 마포구 등록로 1'
  const placeType = body.placeType === 'cafe' ? 'cafe' : 'restaurant'
  const zeropayStatus =
    body.zeropayStatus === 'available'
    || body.zeropayStatus === 'unavailable'
    || body.zeropayStatus === 'needs_verification'
      ? body.zeropayStatus
      : 'available'

  const place = {
    id: 'place-direct-entry-123456789',
    naver_place_id: 'direct-entry-123456789',
    naver_place_url: 'https://map.naver.com/p/search/%EB%93%B1%EB%A1%9D%20%ED%85%8C%EC%8A%A4%ED%8A%B8%20%EC%9E%A5%EC%86%8C',
    name,
    road_address: roadAddress,
    latitude: 37.558721,
    longitude: 126.92444,
    place_type: placeType,
    zeropay_status: zeropayStatus,
    average_rating: ratingScore,
    review_count: 1,
    added_by_name: '테스트 사용자',
    my_review: {
      id: 'review-new-direct-entry-123456789',
      author_name: '테스트 사용자',
      content: reviewContent,
      created_at: '2026-03-08',
      rating_score: ratingScore,
    },
    reviews: [
      {
        id: 'review-new-direct-entry-123456789',
        author_name: '테스트 사용자',
        content: reviewContent,
        created_at: '2026-03-08',
        rating_score: ratingScore,
      },
    ],
  }

  return {
    status: 'created',
    place,
    places: [place, ...cloneMockPlaces()],
    message: '장소를 추가했어요.',
  }
}

const createFetchMock = () =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)

    if (url === '/api/places') {
      return new Response(JSON.stringify({ status: 'success', places: MOCK_PLACES }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const placeId = getPlaceIdFromDetailUrl(url)
    if (placeId) {
      const place = cloneMockPlace(placeId)
      return new Response(JSON.stringify(place ? { status: 'success', place } : { error: { message: 'not found' } }), {
        status: place ? 200 : 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url === '/api/place-submissions') {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      return mockPlaceEntrySuccess(buildCreatedPlacePayload(body))
    }

    return new Response(JSON.stringify({ error: { message: `unexpected request: ${url} ${init?.method ?? 'GET'}` } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  })

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
      ...buildCreatedPlacePayload({}),
      ...overrides,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )

describe('Plan 05 direct place entry shell flow', () => {
  beforeEach(() => {
    resetAppShellStore()
    window.history.replaceState({}, '', '/')
    globalThis.fetch = createFetchMock() as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('replaces the desktop list area with the direct-entry form', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('place-list-ready')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '장소 추가' }))

    expect(window.location.pathname).toBe('/add-place')
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

  it('uses the mobile list surface for direct entry and hides the bottom tab bar while open', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('mobile-bottom-tab-bar')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '장소 추가' }))

    expect(window.location.pathname).toBe('/add-place')
    expect(screen.getByTestId('mobile-place-add-page')).toBeInTheDocument()
    expect(screen.queryByTestId('map-canvas')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mobile-bottom-tab-bar')).not.toBeInTheDocument()
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
      expect(submitButton).not.toHaveTextContent('등록 중')
      expect(submitButton).toHaveAccessibleName('등록 중')
      expect(screen.getByTestId('place-submit-spinner')).toBeInTheDocument()
      expect(screen.queryByTestId('place-submit-loading')).not.toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    const firstCall = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit | undefined] | undefined
    expect(firstCall).toBeDefined()
    const [requestUrl, requestInit] = firstCall ?? ['/api/place-submissions', undefined]
    expect(requestUrl).toBe('/api/place-submissions')
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      name: '등록 테스트 장소',
      placeType: 'restaurant',
      ratingScore: 5,
      roadAddress: '서울 마포구 등록로 1',
      reviewContent: '',
      zeropayStatus: 'available',
    })

    resolveResponse(mockPlaceEntrySuccess(buildCreatedPlacePayload({
      name: '등록 테스트 장소',
      roadAddress: '서울 마포구 등록로 1',
      placeType: 'restaurant',
      zeropayStatus: 'available',
      ratingScore: 5,
      reviewContent: '',
    })))

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

    resolveResponse(mockPlaceEntrySuccess(buildCreatedPlacePayload({
      name: '중복 방지 테스트 장소',
      roadAddress: '서울 마포구 등록로 1',
      placeType: 'restaurant',
      zeropayStatus: 'available',
      ratingScore: 5,
      reviewContent: '',
    })))

    await waitFor(() => {
      expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('중복 방지 테스트 장소')
    })
  })
})
