import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { MOCK_PLACES } from './mockPlaces'
import { resetAppShellStore, useAppShellStore } from './appShellStore'

const originalFetch = globalThis.fetch

const installKakaoRuntimeMock = (initialLevel = 3) => {
  let currentLevel = initialLevel
  const panTo = vi.fn()
  const setLevel = vi.fn((level: number) => {
    currentLevel = level
  })
  const mapInstance = {
    getLevel: () => currentLevel,
    panTo,
    setLevel,
  }

  class MockLatLng {
    latitude: number
    longitude: number

    constructor(latitude: number, longitude: number) {
      this.latitude = latitude
      this.longitude = longitude
    }
  }

  class MockMarker {
    setMap = vi.fn()
    options: unknown

    constructor(options: unknown) {
      this.options = options
    }
  }

  class MockMarkerImage {
    source: string
    size: unknown

    constructor(source: string, size: unknown) {
      this.source = source
      this.size = size
    }
  }

  class MockSize {
    width: number
    height: number

    constructor(width: number, height: number) {
      this.width = width
      this.height = height
    }
  }

  class MockOverlay {
    setMap = vi.fn()
    options: unknown

    constructor(options: unknown) {
      this.options = options
    }
  }

  window.kakao = {
    maps: {
      load: (callback: () => void) => callback(),
      Map: vi.fn(function MockMap() {
        return mapInstance
      }) as unknown as NonNullable<typeof window.kakao>['maps']['Map'],
      LatLng: MockLatLng as unknown as NonNullable<typeof window.kakao>['maps']['LatLng'],
      Marker: MockMarker as unknown as NonNullable<typeof window.kakao>['maps']['Marker'],
      MarkerImage: MockMarkerImage as unknown as NonNullable<typeof window.kakao>['maps']['MarkerImage'],
      Size: MockSize as unknown as NonNullable<typeof window.kakao>['maps']['Size'],
      CustomOverlay: MockOverlay as unknown as NonNullable<typeof window.kakao>['maps']['CustomOverlay'],
      event: {
        addListener: vi.fn(),
      },
    },
  }

  return {
    mapInstance,
    panTo,
    setLevel,
  }
}

const cloneMockPlace = (placeId: string) => {
  const matched = MOCK_PLACES.find((place) => place.id === placeId)
  if (!matched) return null
  return {
    ...matched,
    my_review: matched.my_review ? { ...matched.my_review } : null,
    reviews: matched.reviews.map((review) => ({ ...review })),
  }
}

const createBrowseFetchMock = () =>
  vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

    if (url === '/api/place-list') {
      return new Response(JSON.stringify({
        status: 'success',
        places: MOCK_PLACES,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (url === '/api/auth/session') {
      return new Response(JSON.stringify({
        status: 'authenticated',
        user: {
          id: 'user-1',
          email: 'tester@nurimedia.co.kr',
          name: '테스트 사용자',
        },
        csrfHeaderName: 'x-nurimap-csrf-token',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (url.startsWith('/api/place-detail?placeId=')) {
      const placeId = decodeURIComponent(url.split('=')[1] ?? '')
      const place = cloneMockPlace(placeId)
      if (!place) {
        return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ status: 'success', place }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: { message: 'unexpected request' } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
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

describe('Sprint 16 browse refresh', () => {
  beforeEach(() => {
    resetAppShellStore()
    delete window.kakao
    vi.unstubAllEnvs()
    window.history.replaceState({}, '', '/')
    document.querySelector('script[data-kakao-map-sdk="true"]')?.remove()
    globalThis.fetch = createBrowseFetchMock() as typeof fetch
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    document.querySelector('script[data-kakao-map-sdk="true"]')?.remove()
    globalThis.fetch = originalFetch
  })

  it('starts the map at level 3 without center or selected-place overlays', () => {
    setViewport(1280)
    render(<App />)

    expect(useAppShellStore.getState().mapLevel).toBe(3)
    expect(screen.queryByTestId('map-level')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-zoom-controls')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-center')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-focus-place')).not.toBeInTheDocument()
  })

  it('keeps the minimal desktop browse top bar and bottom logout action', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByAltText('Nurimedia 로고')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-browse-topbar')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-add-button')).toHaveTextContent('추가')
    expect(screen.getByTestId('desktop-add-button')).toHaveAccessibleName('장소 추가')
    expect(screen.getByTestId('desktop-add-button')).toHaveClass('cursor-pointer')
    expect(screen.getByTestId('desktop-add-button')).toHaveClass('h-9')
    expect(screen.getByTestId('desktop-add-button')).toHaveClass('font-semibold')
    expect(screen.getByTestId('desktop-add-button').className).not.toContain('shadow-[')
    expect(screen.getByTestId('desktop-browse-topbar')).toHaveClass('-mt-6')
    expect(screen.getByTestId('desktop-browse-topbar')).toHaveClass('z-10')
    expect(screen.queryByText('오늘 둘러볼 장소')).not.toBeInTheDocument()
    expect(screen.getByTestId('place-list-ready').parentElement).not.toHaveClass('mt-4')
    expect(screen.getByTestId('desktop-browse-footer')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-browse-footer')).toHaveClass('h-9', 'flex', 'items-center')
    expect(screen.getByTestId('desktop-browse-footer')).toHaveClass('-mb-6')
    expect(screen.getByTestId('desktop-browse-footer').className).not.toContain('pl-6')
    expect(screen.getByTestId('desktop-browse-footer').className).not.toContain('-mx-6')
    expect(screen.getByRole('button', { name: '로그아웃' })).toHaveClass('cursor-pointer')
    expect(screen.getByRole('button', { name: '로그아웃' })).toHaveClass('hover:text-[#e52e30]')
  })

  it('renders restaurant and cafe markers with different marker types', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('map-marker-place-restaurant-1')).toHaveAttribute('data-marker-type', 'restaurant')
    expect(screen.getByTestId('map-marker-place-cafe-1')).toHaveAttribute('data-marker-type', 'cafe')
    expect(screen.getByTestId('map-marker-place-restaurant-1')).toHaveAttribute('data-marker-variant', 'user-added')
  })

  it('renders the company location marker at the map center using the provided building icon', () => {
    setViewport(1280)
    render(<App />)

    const companyMarker = screen.getByTestId('map-company-marker')
    const companyGlyph = screen.getByTestId('map-company-marker-glyph')

    expect(companyMarker).toBeInTheDocument()
    expect(companyMarker).toHaveClass('pointer-events-none')
    expect(companyGlyph).toHaveAttribute('src', '/assets/icons/icon-map-company-24.svg')
    expect(companyGlyph).toHaveAttribute('draggable', 'false')
    expect(companyGlyph).toHaveStyle({
      height: '20px',
      width: '20px',
    })
  })

  it('hides the known direct-entry test place from the map so the company marker stays visible', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url === '/api/place-list') {
        return new Response(JSON.stringify({
          status: 'success',
          places: [
            ...MOCK_PLACES,
            {
              id: 'place-direct-entry-123456789',
              naver_place_id: 'direct-entry-123456789',
              naver_place_url: 'https://map.naver.com/p/entry/place/direct-entry-123456789',
              name: '등록 테스트 장소',
              road_address: '서울 마포구 등록로 1',
              latitude: 37.558721,
              longitude: 126.92444,
              place_type: 'restaurant',
              zeropay_status: 'available',
              average_rating: 5,
              review_count: 1,
              added_by_name: '테스트 사용자',
              my_review: null,
              reviews: [],
            },
          ],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      if (url === '/api/auth/session') {
        return new Response(JSON.stringify({
          status: 'authenticated',
          user: {
            id: 'user-1',
            email: 'tester@nurimedia.co.kr',
            name: '테스트 사용자',
          },
          csrfHeaderName: 'x-nurimap-csrf-token',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ error: { message: 'unexpected request' } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    })

    globalThis.fetch = fetchMock as typeof fetch
    setViewport(1280)
    render(<App />)

    expect(await screen.findByTestId('map-company-marker')).toBeInTheDocument()
    expect(screen.queryByTestId('map-marker-place-direct-entry-123456789')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-label-place-direct-entry-123456789')).not.toBeInTheDocument()
  })

  it('renders outlined user-added place labels for visible map markers', () => {
    setViewport(1280)
    render(<App />)

    const label = screen.getByTestId('map-label-place-restaurant-1')

    expect(label).toHaveTextContent('누리 식당')
    expect(label).toHaveStyle({
      color: 'rgb(88, 98, 251)',
      fontSize: '10px',
      fontWeight: '500',
      lineHeight: '100%',
    })
    expect(label).toHaveStyle('-webkit-text-stroke: 2px #FFFFFF')
  })

  it('matches the level 1 figma marker and label baseline', () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 1 })
    render(<App />)

    const markerGlyph = screen.getByTestId('map-marker-glyph-place-restaurant-1')
    const innerCircle = markerGlyph.firstElementChild as HTMLElement | null

    expect(markerGlyph.getAttribute('style')).toContain('background: rgb(88, 98, 251);')
    expect(markerGlyph.getAttribute('style')).toContain('border: 2px solid rgb(255, 255, 255);')
    expect(markerGlyph.getAttribute('style')).toContain('border-radius: 24px;')
    expect(markerGlyph.getAttribute('style')).toContain('box-shadow: 0 0 4px 1px rgba(0, 0, 0, 0.08);')
    expect(markerGlyph).toHaveStyle({
      height: '24px',
      width: '24px',
    })
    expect(innerCircle).not.toBeNull()
    expect(innerCircle).toHaveStyle({
      background: 'rgb(255, 255, 255)',
      height: '8px',
      width: '8px',
    })
    expect(screen.getByTestId('map-company-marker-glyph')).toHaveStyle({
      height: '24px',
      width: '24px',
    })
    expect(screen.getByTestId('map-label-place-restaurant-1')).toHaveStyle({
      color: 'rgb(88, 98, 251)',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '100%',
    })
    expect(screen.getByTestId('map-label-place-restaurant-1')).toHaveStyle('-webkit-text-stroke: 3px #FFFFFF')
    expect(screen.getByTestId('map-label-anchor-place-restaurant-1')).toHaveStyle({
      top: '44px',
    })
  })

  it('applies the level 2 marker and label sizing from the zoom table', () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 2 })
    render(<App />)

    expect(screen.getByTestId('map-marker-glyph-place-restaurant-1')).toHaveStyle({
      height: '22px',
      width: '22px',
    })
    expect(screen.getByTestId('map-label-place-restaurant-1')).toHaveStyle({
      fontSize: '12px',
      fontWeight: '500',
      lineHeight: '100%',
    })
    expect(screen.getByTestId('map-label-place-restaurant-1')).toHaveStyle('-webkit-text-stroke: 3px #FFFFFF')
    expect(screen.getByTestId('map-label-anchor-place-restaurant-1')).toHaveStyle({
      top: '39px',
    })
  })

  it('shows marker only at level 4', () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 4 })
    render(<App />)

    expect(screen.getByTestId('map-marker-place-restaurant-1')).toBeInTheDocument()
    expect(screen.getByTestId('map-marker-glyph-place-restaurant-1')).toHaveStyle({
      height: '18px',
      width: '18px',
    })
    expect(screen.getByTestId('map-company-marker-glyph')).toHaveStyle({
      height: '18px',
      width: '18px',
    })
    expect(screen.queryByTestId('map-label-place-restaurant-1')).not.toBeInTheDocument()
  })

  it('applies the level 3 marker and label sizing from the zoom table', () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 3 })
    render(<App />)

    expect(screen.getByTestId('map-marker-glyph-place-restaurant-1')).toHaveStyle({
      height: '20px',
      width: '20px',
    })
    expect(screen.getByTestId('map-label-place-restaurant-1')).toHaveStyle({
      fontSize: '10px',
      fontWeight: '500',
      lineHeight: '100%',
    })
    expect(screen.getByTestId('map-label-place-restaurant-1')).toHaveStyle('-webkit-text-stroke: 2px #FFFFFF')
    expect(screen.getByTestId('map-label-anchor-place-restaurant-1')).toHaveStyle({
      top: '30px',
    })
  })

  it('opens desktop detail inside the sidebar instead of a floating overlay when a map marker is selected', async () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 1 })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('map-marker-place-cafe-1'))

    const sidebar = screen.getByTestId('desktop-sidebar')
    const detail = screen.getByTestId('desktop-detail-panel')

    expect(sidebar).toContainElement(detail)
    expect(detail).toHaveTextContent('양화로 카페')
    expect(detail.className).not.toContain('absolute')
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(useAppShellStore.getState().mapLevel).toBe(1)
  })

  it('hides markers and labels at level 5', () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 5 })
    render(<App />)

    expect(screen.queryByTestId('map-marker-place-restaurant-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-label-place-restaurant-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-company-marker')).not.toBeInTheDocument()
  })

  it('hides markers and labels at level 6', () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 6 })
    render(<App />)

    expect(screen.queryByTestId('map-marker-place-restaurant-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-label-place-restaurant-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-company-marker')).not.toBeInTheDocument()
  })

  it('hides map level chrome and zoom buttons from the map surface', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.queryByTestId('map-level')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-zoom-controls')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '지도 확대' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '지도 축소' })).not.toBeInTheDocument()
    expect(screen.getByTestId('map-label-place-restaurant-1')).toBeInTheDocument()
    expect(screen.queryByTestId('map-center')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-focus-place')).not.toBeInTheDocument()
  })

  it('renders the refreshed browse cards with place name top row and rating review type meta row', () => {
    setViewport(1280)
    render(<App />)

    const list = screen.getByTestId('place-list-ready')
    const zeropayRestaurantCard = screen.getByTestId('place-list-item-place-restaurant-1')
    const unavailableRestaurantCard = screen.getByTestId('place-list-item-place-restaurant-2')
    const cafeCard = screen.getByTestId('place-list-item-place-cafe-1')
    const zeropayCafeCard = screen.getByTestId('place-list-item-place-review-fail')

    expect(list.className).not.toContain('space-y-3')

    expect(zeropayRestaurantCard).toHaveTextContent('누리 식당')
    expect(zeropayRestaurantCard).toHaveClass('cursor-pointer')
    expect(zeropayRestaurantCard.className).not.toContain('hover:bg-')
    expect(zeropayRestaurantCard).toHaveTextContent('4.7')
    expect(zeropayRestaurantCard).toHaveTextContent('리뷰')
    expect(zeropayRestaurantCard).toHaveTextContent('12')
    expect(zeropayRestaurantCard).toHaveTextContent('음식점')
    expect(zeropayRestaurantCard).not.toHaveTextContent('제로페이')
    expect(zeropayRestaurantCard).not.toHaveTextContent('서울 마포구 양화로19길 22-16 1층')
    expect(screen.getByTestId('place-list-type-icon-place-restaurant-1')).toHaveAttribute('src', '/assets/icons/icon-place-type-restaurant-muted.svg')
    expect(screen.getByTestId('place-list-rating-icon-place-restaurant-1')).toHaveAttribute('src', '/assets/icons/icon-rating-star-red-16.svg')
    expect(screen.getByTestId('place-list-zeropay-icon-place-restaurant-1')).toHaveAttribute('src', '/assets/icons/icon-payment-zeropay-accent.svg')

    expect(unavailableRestaurantCard).toHaveTextContent('합정 점심집')
    expect(unavailableRestaurantCard).toHaveTextContent('4.1')
    expect(unavailableRestaurantCard).toHaveTextContent('리뷰')
    expect(unavailableRestaurantCard).toHaveTextContent('5')
    expect(unavailableRestaurantCard).toHaveTextContent('음식점')
    expect(unavailableRestaurantCard).not.toHaveTextContent('제로페이')
    expect(screen.getByTestId('place-list-type-icon-place-restaurant-2')).toHaveAttribute('src', '/assets/icons/icon-place-type-restaurant-muted.svg')
    expect(screen.queryByTestId('place-list-zeropay-icon-place-restaurant-2')).not.toBeInTheDocument()

    expect(cafeCard).toHaveTextContent('양화로 카페')
    expect(cafeCard).toHaveTextContent('4.3')
    expect(cafeCard).toHaveTextContent('리뷰')
    expect(cafeCard).toHaveTextContent('8')
    expect(cafeCard).toHaveTextContent('카페')
    expect(cafeCard).not.toHaveTextContent('제로페이')
    expect(cafeCard).not.toHaveTextContent('서울 마포구 양화로19길 20 2층')
    expect(screen.getByTestId('place-list-type-icon-place-cafe-1')).toHaveAttribute('src', '/assets/icons/icon-place-type-cafe-muted.svg')
    expect(screen.queryByTestId('place-list-zeropay-icon-place-cafe-1')).not.toBeInTheDocument()

    expect(zeropayCafeCard).toHaveTextContent('리뷰 저장 실패 장소')
    expect(zeropayCafeCard).toHaveTextContent('3.9')
    expect(zeropayCafeCard).toHaveTextContent('리뷰')
    expect(zeropayCafeCard).toHaveTextContent('3')
    expect(zeropayCafeCard).toHaveTextContent('카페')
    expect(zeropayCafeCard).not.toHaveTextContent('제로페이')
    expect(screen.getByTestId('place-list-type-icon-place-review-fail')).toHaveAttribute('src', '/assets/icons/icon-place-type-cafe-muted.svg')
    expect(screen.getByTestId('place-list-zeropay-icon-place-review-fail')).toHaveAttribute('src', '/assets/icons/icon-payment-zeropay-accent.svg')
  })

  it('shows the zeropay tooltip after hovering the qr icon for 400ms', async () => {
    vi.useFakeTimers()

    try {
      setViewport(1280)
      render(<App />)

      const trigger = screen.getByTestId('place-list-zeropay-trigger-place-restaurant-1')

      expect(screen.queryByTestId('place-list-zeropay-tooltip-place-restaurant-1')).not.toBeInTheDocument()

      fireEvent.mouseEnter(trigger)
      act(() => {
        vi.advanceTimersByTime(399)
      })
      expect(screen.queryByTestId('place-list-zeropay-tooltip-place-restaurant-1')).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(screen.getByTestId('place-list-zeropay-tooltip-place-restaurant-1')).toHaveTextContent('제로페이 가능')

      fireEvent.mouseLeave(trigger)
      expect(screen.queryByTestId('place-list-zeropay-tooltip-place-restaurant-1')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens the detail flow when a desktop list item is selected', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-2'))

    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('합정 점심집')
    expect(screen.getByRole('button', { name: '목록으로 돌아가기' })).toBeInTheDocument()
  })

  it('opens the refreshed mobile list and full-screen detail flow', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    expect(screen.getByTestId('mobile-list-header')).toContainElement(screen.getByAltText('Nurimedia 로고'))
    expect(screen.getByTestId('mobile-list-page')).toHaveTextContent('누리맵')
    expect(screen.getByTestId('mobile-list-logout-button')).toHaveAccessibleName('로그아웃')
    expect(screen.queryByText('오늘 둘러볼 장소')).not.toBeInTheDocument()
    expect(screen.getByTestId('mobile-tab-list')).toHaveAttribute('data-active', 'true')

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('장소 상세')
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('누리 식당')
  })

  it('does not pan or zoom the Kakao map on mobile detail open or in-app back', async () => {
    setViewport(390)
    useAppShellStore.setState({ mapLevel: 1 })
    const user = userEvent.setup()
    const { panTo, setLevel } = installKakaoRuntimeMock(1)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(window.location.pathname).toBe('/places/place-restaurant-1')
    expect(useAppShellStore.getState().mapLevel).toBe(1)
    expect(setLevel).not.toHaveBeenCalled()
    expect(panTo).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '뒤로 가기' }))

    expect(window.location.pathname).toBe('/')
    expect(useAppShellStore.getState().mapLevel).toBe(1)
    expect(setLevel).not.toHaveBeenCalled()
    expect(panTo).not.toHaveBeenCalled()
  })

  it('does not pan or zoom the Kakao map on mobile browser/history back from detail', async () => {
    setViewport(390)
    useAppShellStore.setState({ mapLevel: 1 })
    const user = userEvent.setup()
    const { panTo, setLevel } = installKakaoRuntimeMock(1)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))

    expect(window.location.pathname).toBe('/places/place-cafe-1')
    expect(useAppShellStore.getState().mapLevel).toBe(1)
    expect(setLevel).not.toHaveBeenCalled()
    expect(panTo).not.toHaveBeenCalled()

    act(() => {
      window.history.replaceState({}, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(window.location.pathname).toBe('/')
    expect(useAppShellStore.getState().mapLevel).toBe(1)
    expect(setLevel).not.toHaveBeenCalled()
    expect(panTo).not.toHaveBeenCalled()
  })

  it('renders the unified loading state while browse data is still bootstrapping', () => {
    setViewport(1280)
    useAppShellStore.setState({ placeListLoad: 'loading' })
    render(<App />)

    expect(screen.getByTestId('browse-bootstrap-loading')).toHaveTextContent('데이터를 불러오는 중이에요.')
    expect(screen.getByTestId('browse-bootstrap-loading')).toHaveTextContent('잠시만 기다려 주세요.')
    expect(screen.queryByTestId('place-list-loading')).not.toBeInTheDocument()
  })

  it('renders the unified loading state while the runtime Kakao map is still bootstrapping', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('PUBLIC_KAKAO_MAP_APP_KEY', 'test-kakao-key')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    setViewport(1280)
    render(<App />)

    expect(await screen.findByTestId('browse-bootstrap-loading')).toHaveTextContent('데이터를 불러오는 중이에요.')
    expect(screen.queryByTestId('map-marker-place-restaurant-1')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '지도 확대' })).not.toBeInTheDocument()
  })

  it('shows a retryable unified browse error state after the SDK script fails to load', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('PUBLIC_KAKAO_MAP_APP_KEY', 'test-kakao-key')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await screen.findByTestId('browse-bootstrap-loading')

    const script = document.querySelector<HTMLScriptElement>('script[data-kakao-map-sdk="true"]')
    expect(script).not.toBeNull()

    act(() => {
      script?.dispatchEvent(new Event('error'))
    })

    expect(screen.getByTestId('browse-bootstrap-error')).toHaveTextContent('데이터를 불러오지 못했어요.')
    expect(screen.getByTestId('browse-bootstrap-error')).toHaveTextContent('네트워크 상태를 확인한 뒤 다시 시도해주세요.')
    expect(screen.getByRole('button', { name: '다시 시도' })).toHaveClass('h-12', 'py-3', 'font-semibold')
    expect(screen.queryByTestId('map-marker-place-restaurant-1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(screen.getByTestId('browse-bootstrap-loading')).toHaveTextContent('데이터를 불러오는 중이에요.')
  })

  it('treats an incomplete kakao runtime as a unified browse error instead of trying to construct the map', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('PUBLIC_KAKAO_MAP_APP_KEY', 'test-kakao-key')
    vi.stubEnv('VITE_LOCAL_AUTO_LOGIN', 'false')
    setViewport(1280)
    window.kakao = {
      maps: {
        load: (callback: () => void) => callback(),
      } as unknown as NonNullable<typeof window.kakao>['maps'],
    }

    render(<App />)

    expect(await screen.findByTestId('browse-bootstrap-error')).toBeInTheDocument()
  })

  it('renders the unified error state and retry action when the place list load fails', () => {
    setViewport(1280)
    useAppShellStore.setState({ placeListLoad: 'error' })
    render(<App />)

    expect(screen.getByTestId('browse-bootstrap-error')).toHaveTextContent('데이터를 불러오지 못했어요.')
    expect(screen.getByTestId('browse-bootstrap-error')).toHaveTextContent('네트워크 상태를 확인한 뒤 다시 시도해주세요.')
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(screen.queryByTestId('place-list-error')).not.toBeInTheDocument()
  })
})
