import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { resetAppShellStore, useAppShellStore } from './appShellStore'

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

describe('Plan 02 browse basics', () => {
  beforeEach(() => {
    resetAppShellStore()
    delete window.kakao
  })

  it('shows the initial map center coordinates', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('map-center')).toHaveTextContent('37.558721, 126.92444')
  })

  it('removes the legacy hero copy but keeps compact map status hooks', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.queryByText('내부 장소 지도를 위한 앱 셸')).not.toBeInTheDocument()
    expect(screen.queryByText(/Plan 02에서는 Kakao Map과 목록 탐색의 기본 상호작용을 검증합니다\./)).not.toBeInTheDocument()
    expect(screen.getByTestId('map-center')).toHaveTextContent('37.558721, 126.92444')
    expect(screen.getByTestId('map-level')).toHaveTextContent('level 5')
  })

  it('renders restaurant and cafe markers with different marker types', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('map-marker-place-restaurant-1')).toHaveAttribute('data-marker-type', 'restaurant')
    expect(screen.getByTestId('map-marker-place-cafe-1')).toHaveAttribute('data-marker-type', 'cafe')
  })

  it('opens the detail flow when a map marker is selected', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('map-marker-place-cafe-1'))

    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('양화로 카페')
  })

  it('shows marker labels at level 5', () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 5 })
    render(<App />)

    expect(screen.getByTestId('map-label-place-restaurant-1')).toBeInTheDocument()
  })

  it('hides marker labels at level 6', () => {
    setViewport(1280)
    useAppShellStore.setState({ mapLevel: 6 })
    render(<App />)

    expect(screen.queryByTestId('map-label-place-restaurant-1')).not.toBeInTheDocument()
  })

  it('renders map zoom controls and keeps map level in sync while zooming', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('button', { name: '지도 확대' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '지도 축소' })).toBeInTheDocument()
    expect(screen.getByTestId('map-label-place-restaurant-1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '지도 축소' }))

    expect(screen.getByTestId('map-level')).toHaveTextContent('level 6')
    expect(screen.queryByTestId('map-label-place-restaurant-1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '지도 확대' }))

    expect(screen.getByTestId('map-level')).toHaveTextContent('level 5')
    expect(screen.getByTestId('map-label-place-restaurant-1')).toBeInTheDocument()
  })

  it('attaches the official Kakao zoom control in runtime mode', () => {
    setViewport(1280)
    const zoomControl = { kind: 'zoom-control' }
    const addControl = vi.fn()
    const getLevel = vi.fn(() => 5)
    const setLevel = vi.fn()
    const panTo = vi.fn()

    function MockMap() {
      return {
        addControl,
        getLevel,
        panTo,
        setLevel,
      }
    }

    function MockLatLng(latitude: number, longitude: number) {
      return { latitude, longitude }
    }

    function MockMarker() {
      return {
        setMap: vi.fn(),
      }
    }

    function MockMarkerImage() {
      return {}
    }

    function MockSize() {
      return {}
    }

    function MockZoomControl() {
      return zoomControl
    }

    function MockCustomOverlay() {
      return {
        setMap: vi.fn(),
      }
    }

    window.kakao = {
      maps: {
        load: (callback: () => void) => callback(),
        Map: vi.fn(MockMap) as never,
        LatLng: vi.fn(MockLatLng) as never,
        Marker: vi.fn(MockMarker) as never,
        MarkerImage: vi.fn(MockMarkerImage) as never,
        Size: vi.fn(MockSize) as never,
        ZoomControl: vi.fn(MockZoomControl) as never,
        ControlPosition: {
          RIGHT: 'RIGHT',
        },
        CustomOverlay: vi.fn(MockCustomOverlay) as never,
        event: {
          addListener: vi.fn(),
        },
      },
    }

    render(<App />)

    expect(window.kakao.maps.ZoomControl).toHaveBeenCalledTimes(1)
    expect(addControl).toHaveBeenCalledWith(zoomControl, 'RIGHT')
  })

  it('does not render map markers for places without coordinates', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.queryByTestId('map-marker-place-no-coord')).not.toBeInTheDocument()
  })

  it('renders list fields for places in the desktop sidebar', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('place-list-item-place-restaurant-1')).toHaveTextContent('누리 식당')
    expect(screen.getByTestId('place-list-item-place-restaurant-1')).toHaveTextContent('★ 4.7 · 리뷰 12')
  })

  it('shows the zeropay badge only for available places', () => {
    setViewport(1280)
    render(<App />)

    expect(within(screen.getByTestId('place-list-item-place-restaurant-1')).getByTestId('zeropay-badge')).toBeInTheDocument()
    expect(screen.getByTestId('place-list-item-place-cafe-1')).not.toHaveTextContent('제로페이')
    expect(screen.getByTestId('place-list-item-place-restaurant-2')).not.toHaveTextContent('제로페이')
  })

  it('opens the detail flow when a desktop list item is selected', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-2'))

    expect(screen.getByTestId('desktop-detail-panel')).toHaveTextContent('합정 점심집')
  })

  it('opens the full-screen mobile detail page when a mobile list item is selected', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('누리 식당')
  })

  it('renders the loading state in the list area', () => {
    setViewport(1280)
    useAppShellStore.setState({ placeListLoad: 'loading' })
    render(<App />)

    expect(screen.getByTestId('place-list-loading')).toBeInTheDocument()
  })

  it('renders the error state and retry action in the list area', () => {
    setViewport(1280)
    useAppShellStore.setState({ placeListLoad: 'error' })
    render(<App />)

    expect(screen.getByTestId('place-list-error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
})
