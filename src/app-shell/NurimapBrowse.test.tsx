import { act, render, screen } from '@testing-library/react'
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

describe('Sprint 15 browse refresh', () => {
  beforeEach(() => {
    resetAppShellStore()
    delete window.kakao
  })

  it('shows the initial map center coordinates', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('map-center')).toHaveTextContent('37.558721, 126.92444')
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
    expect(screen.getByTestId('desktop-browse-footer')).toHaveClass('-mb-6')
    expect(screen.getByRole('button', { name: '로그아웃' })).toHaveClass('inset-y-0')
    expect(screen.getByRole('button', { name: '로그아웃' })).toHaveClass('cursor-pointer')
    expect(screen.getByRole('button', { name: '로그아웃' })).toHaveClass('hover:text-[#e52e30]')
  })

  it('renders restaurant and cafe markers with different marker types', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('map-marker-place-restaurant-1')).toHaveAttribute('data-marker-type', 'restaurant')
    expect(screen.getByTestId('map-marker-place-cafe-1')).toHaveAttribute('data-marker-type', 'cafe')
  })

  it('opens desktop detail inside the sidebar instead of a floating overlay when a map marker is selected', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('map-marker-place-cafe-1'))

    const sidebar = screen.getByTestId('desktop-sidebar')
    const detail = screen.getByTestId('desktop-detail-panel')

    expect(sidebar).toContainElement(detail)
    expect(detail).toHaveTextContent('양화로 카페')
    expect(detail.className).not.toContain('absolute')
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
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

  it('renders the refreshed browse cards with rating/review metadata and optional zeropay text', () => {
    setViewport(1280)
    render(<App />)

    const list = screen.getByTestId('place-list-ready')
    const zeropayRestaurantCard = screen.getByTestId('place-list-item-place-restaurant-1')
    const unavailableRestaurantCard = screen.getByTestId('place-list-item-place-restaurant-2')
    const cafeCard = screen.getByTestId('place-list-item-place-cafe-1')

    expect(list.className).not.toContain('space-y-3')
    expect(zeropayRestaurantCard).toHaveTextContent('누리 식당')
    expect(zeropayRestaurantCard).toHaveClass('cursor-pointer')
    expect(zeropayRestaurantCard.className).not.toContain('hover:bg-')
    expect(zeropayRestaurantCard).toHaveTextContent('4.7')
    expect(zeropayRestaurantCard).toHaveTextContent('리뷰')
    expect(zeropayRestaurantCard).toHaveTextContent('12')
    expect(zeropayRestaurantCard).toHaveTextContent('제로페이')
    expect(zeropayRestaurantCard).not.toHaveTextContent('서울 마포구 양화로19길 22-16 1층')
    expect(screen.getByTestId('place-list-type-icon-place-restaurant-1')).toBeInTheDocument()
    expect(screen.getByTestId('place-list-rating-icon-place-restaurant-1')).toHaveAttribute('src', '/assets/icons/icon-rating-star-red-16.svg')

    expect(unavailableRestaurantCard).toHaveTextContent('합정 점심집')
    expect(unavailableRestaurantCard).toHaveTextContent('4.1')
    expect(unavailableRestaurantCard).toHaveTextContent('리뷰')
    expect(unavailableRestaurantCard).toHaveTextContent('5')
    expect(unavailableRestaurantCard).not.toHaveTextContent('제로페이')
    expect(screen.getByTestId('place-list-type-icon-place-restaurant-2')).toBeInTheDocument()

    expect(cafeCard).toHaveTextContent('양화로 카페')
    expect(cafeCard).toHaveTextContent('4.3')
    expect(cafeCard).toHaveTextContent('8')
    expect(cafeCard).not.toHaveTextContent('서울 마포구 양화로19길 20 2층')
    expect(screen.getByTestId('place-list-type-icon-place-cafe-1')).toBeInTheDocument()
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
    expect(screen.getByTestId('mobile-list-page')).toHaveTextContent('오늘 둘러볼 장소')

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('장소 상세')
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
