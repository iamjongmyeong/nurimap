import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { resetAppShellStore, useAppShellStore } from './app-shell/appShellStore'

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

describe('Nurimap app shell', () => {
  beforeEach(() => {
    resetAppShellStore()
    window.history.replaceState({}, '', '/')
  })

  it('renders the desktop sidebar with the white surface background', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('desktop-sidebar')).toHaveClass('bg-[#fff]')
  })

  it('renders the desktop floating detail panel when detail is open', () => {
    setViewport(1280)
    window.history.replaceState({}, '', '/places/place-restaurant-1')
    render(<App />)

    expect(screen.getByTestId('desktop-detail-panel')).toBeInTheDocument()
  })

  it('keeps the map visible behind the desktop detail panel', () => {
    setViewport(1280)
    window.history.replaceState({}, '', '/places/place-restaurant-1')
    render(<App />)

    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('desktop-detail-panel')).toBeInTheDocument()
  })

  it('renders the mobile bottom tab bar over the full-screen map', () => {
    setViewport(390)
    render(<App />)

    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toHaveClass('h-14')
    expect(screen.getByTestId('mobile-bottom-tab-bar-grid')).toHaveClass('h-14')
    expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('mobile-tab-map')).toHaveClass('h-10', 'w-10', 'px-2', 'pt-[2px]', 'pb-0', 'gap-1')
    expect(screen.getByTestId('mobile-tab-add')).toHaveClass('h-10', 'w-10', 'px-2', 'pt-[2px]', 'pb-0', 'gap-1')
    expect(screen.getByTestId('mobile-tab-list')).toHaveClass('h-10', 'w-10', 'px-2', 'pt-[2px]', 'pb-0', 'gap-1')
    expect(screen.getByTestId('mobile-tab-map-icon')).toHaveClass('h-6', 'w-6', 'shrink-0')
    expect(screen.getByTestId('mobile-tab-add-icon')).toHaveClass('h-6', 'w-6', 'shrink-0')
    expect(screen.getByTestId('mobile-tab-list-icon')).toHaveClass('h-6', 'w-6', 'shrink-0')
    expect(screen.getByText('지도')).toHaveClass('h-[10px]', 'whitespace-nowrap', "font-['Pretendard']", 'text-[10px]', 'font-normal', 'leading-[10px]')
    expect(screen.getByText('추가')).toHaveClass('h-[10px]', 'whitespace-nowrap', "font-['Pretendard']", 'text-[10px]', 'font-normal', 'leading-[10px]')
    expect(screen.getByText('목록')).toHaveClass('h-[10px]', 'whitespace-nowrap', "font-['Pretendard']", 'text-[10px]', 'font-normal', 'leading-[10px]')
    expect(screen.getByTestId('mobile-tab-map-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-map-black.svg')
    expect(screen.getByTestId('mobile-tab-add-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-plus-gray.svg')
    expect(screen.getByTestId('mobile-tab-list-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-list-gray.svg')
    expect(screen.getByText('지도')).toBeInTheDocument()
    expect(screen.getByText('추가')).toBeInTheDocument()
    expect(screen.getByText('목록')).toBeInTheDocument()
  })

  it('moves to the mobile place list page when the list button is clicked', async () => {
    setViewport(390)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '목록 보기' }))

    expect(screen.getByTestId('mobile-list-page')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-tab-list')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('mobile-tab-map-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-map-gray.svg')
    expect(screen.getByTestId('mobile-tab-list-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-list-black.svg')

    await user.click(screen.getByRole('button', { name: '지도' }))

    expect(screen.queryByTestId('mobile-list-page')).not.toBeInTheDocument()
    expect(screen.getByTestId('mobile-tab-map')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('mobile-tab-list')).toHaveAttribute('data-active', 'false')
    expect(screen.getByTestId('mobile-tab-map-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-map-black.svg')
    expect(screen.getByTestId('mobile-tab-list-icon')).toHaveAttribute('src', '/assets/icons/icon-bottom-tab-list-gray.svg')
  })

  it('does not render the mobile bottom tab bar on desktop', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.queryByTestId('mobile-bottom-tab-bar')).not.toBeInTheDocument()
  })

  it('renders the compact desktop add button inside the refreshed top bar', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('desktop-browse-topbar')).toContainElement(screen.getByTestId('desktop-add-button'))
    expect(screen.getByTestId('desktop-add-button')).toHaveTextContent('추가')
    expect(screen.getByTestId('desktop-add-button')).toHaveAccessibleName('장소 추가')
    expect(screen.getByTestId('desktop-add-button')).toHaveClass('h-9')
  })

  it('renders the empty state when the list state is empty', () => {
    setViewport(1280)
    useAppShellStore.setState({ placeListLoad: 'empty' })
    render(<App />)

    expect(screen.getByText('아직 등록된 장소가 없어요')).toBeInTheDocument()
  })
})
