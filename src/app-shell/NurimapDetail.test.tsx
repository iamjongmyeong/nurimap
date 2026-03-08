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

describe('Plan 03 place detail', () => {
  beforeEach(() => {
    resetAppShellStore()
  })

  it('shows the required detail fields', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    const detail = screen.getByTestId('desktop-detail-panel')
    expect(detail).toHaveTextContent('누리 식당')
    expect(detail).toHaveTextContent('서울 마포구 양화로19길 22-16 1층')
    expect(detail).toHaveTextContent('등록자')
    expect(detail).toHaveTextContent('추천 수')
    expect(detail).toHaveTextContent('리뷰')
  })

  it('shows the my rating status', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('detail-my-rating-status')).toHaveTextContent('5점')
  })

  it('hides the review compose UI when my review exists', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.queryByTestId('detail-review-compose')).not.toBeInTheDocument()
    expect(screen.getByTestId('detail-my-review')).toBeInTheDocument()
  })

  it('shows the review compose UI when my review does not exist', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-cafe-1'))

    expect(screen.getByTestId('detail-review-compose')).toBeInTheDocument()
    expect(screen.queryByTestId('detail-my-review')).not.toBeInTheDocument()
  })

  it('provides the naver map link', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('detail-naver-link')).toHaveAttribute(
      'href',
      'https://map.naver.com/p/entry/place/10001',
    )
  })

  it('closes the desktop detail panel and returns to map browse on close', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))
    await user.click(screen.getByRole('button', { name: '상세 패널 닫기' }))

    expect(screen.queryByTestId('desktop-detail-panel')).not.toBeInTheDocument()
  })

  it('shows the mobile detail page as a full-screen page', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))
    await user.click(screen.getByTestId('place-list-item-place-restaurant-1'))

    expect(screen.getByTestId('mobile-detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-detail-page')).toHaveTextContent('전체 화면 상세')
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
