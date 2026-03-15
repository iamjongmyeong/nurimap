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

describe('Sprint 15 place detail refresh', () => {
  beforeEach(() => {
    resetAppShellStore()
  })

  it('shows the simplified desktop detail fields and removes legacy modules', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    const detail = screen.getByTestId('desktop-detail-panel')
    expect(detail).toHaveTextContent('누리 식당')
    expect(screen.getByTestId('detail-address')).toHaveTextContent('서울 마포구 양화로19길 22-16 1층')
    expect(screen.getByTestId('detail-meta-type')).toHaveTextContent('식당')
    expect(screen.getByTestId('detail-meta-rating')).toHaveTextContent('4.7 · 리뷰 12')
    expect(screen.getByTestId('detail-zeropay-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('detail-review-section')).toHaveTextContent('리뷰 12')
    expect(screen.getByTestId('detail-review-list')).toHaveTextContent('박지도')
    expect(detail).not.toHaveTextContent('네이버 지도 이동')
    expect(detail).not.toHaveTextContent('추천 수')
    expect(detail).not.toHaveTextContent('내 리뷰')
    expect(screen.queryByTestId('detail-review-compose')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-my-review')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-recommendation-control')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-naver-link')).not.toBeInTheDocument()
  })

  it('shows no zeropay qr icon for places without available zeropay', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))

    expect(screen.queryByTestId('detail-zeropay-indicator')).not.toBeInTheDocument()
  })

  it('returns from desktop detail to browse mode with the new back control', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))
    await user.click(screen.getByRole('button', { name: '목록으로 돌아가기' }))

    expect(screen.queryByTestId('desktop-detail-panel')).not.toBeInTheDocument()
    expect(screen.getByText('오늘 둘러볼 장소')).toBeInTheDocument()
  })

  it('keeps the map visible while desktop detail is shown in the sidebar', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-sidebar')).toContainElement(screen.getByTestId('desktop-detail-panel'))
  })

  it('shows the refreshed mobile detail page as a full-screen page', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('장소 상세')
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('누리 식당')
    expect(screen.getByTestId('detail-address')).toHaveTextContent('서울 마포구 양화로19길 22-16 1층')
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('리뷰 12')
  })

  it('returns to the map screen on mobile back and keeps the selected place', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))
    await user.click(screen.getByRole('button', { name: '← 뒤로' }))

    expect(screen.queryByTestId('mobile-detail-page')).not.toBeInTheDocument()
    expect(useAppShellStore.getState().selectedPlaceId).toBe('place-restaurant-1')
    expect(screen.getByTestId('map-center')).toHaveTextContent('37.55918, 126.92374')
  })

  it('returns to the map screen on mobile browser back and keeps the selected place', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(screen.queryByTestId('mobile-detail-page')).not.toBeInTheDocument()
    expect(useAppShellStore.getState().selectedPlaceId).toBe('place-cafe-1')
    expect(screen.getByTestId('map-center')).toHaveTextContent('37.55831, 126.92518')
  })

  it('shows the detail loading state', () => {
    setViewport(1280)
    useAppShellStore.setState({
      navigationState: 'place_detail_open',
      selectedPlaceId: 'place-restaurant-1',
      placeDetailLoad: 'loading',
    })
    render(<App />)

    expect(screen.getByTestId('place-detail-loading')).toBeInTheDocument()
  })

  it('shows the detail error state and retry action', () => {
    setViewport(1280)
    useAppShellStore.setState({
      navigationState: 'place_detail_open',
      selectedPlaceId: 'place-restaurant-1',
      placeDetailLoad: 'error',
    })
    render(<App />)

    expect(screen.getByTestId('place-detail-error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
})
