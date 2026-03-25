import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { resetAppShellStore } from './app-shell/appShellStore'
import { MOCK_PLACES } from './app-shell/mockPlaces'

vi.mock('agentation', () => ({
  Agentation: ({ endpoint }: { endpoint?: string }) => (
    <div data-testid="agentation-toolbar" data-endpoint={endpoint ?? ''}>
      Agentation
    </div>
  ),
}))

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

const createAppShellFetchMock = () =>
  vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)

    if (url === '/api/place-list') {
      return new Response(JSON.stringify({
        status: 'success',
        places: MOCK_PLACES,
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

    if (url === '/api/place-review') {
      return new Response(JSON.stringify({ error: { message: 'not implemented in this suite' } }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    if (url === 'http://localhost:4747/health') {
      return new Response(JSON.stringify({ status: 'unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ status: 'missing' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })

const setViewport = (width: number, height = 844) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  })

  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

describe('Nurimap app shell', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    resetAppShellStore()
    window.history.replaceState({}, '', '/')
    globalThis.fetch = createAppShellFetchMock() as typeof fetch
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    globalThis.fetch = originalFetch
  })

  it('renders Agentation in local mode when explicitly enabled without a healthy sync server', async () => {
    vi.stubEnv('VITE_ENABLE_AGENTATION', 'true')
    setViewport(1280)
    render(<App />)

    const toolbar = await screen.findByTestId('agentation-toolbar')
    expect(toolbar).toHaveAttribute('data-endpoint', '')
  })

  it('passes the sync endpoint to Agentation after the health check succeeds', async () => {
    vi.stubEnv('VITE_ENABLE_AGENTATION', 'true')
    const fetchMock = createAppShellFetchMock()
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === 'http://localhost:4747/health') {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      return await createAppShellFetchMock()(input)
    })
    globalThis.fetch = fetchMock as typeof fetch
    setViewport(1280)
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('agentation-toolbar')).toHaveAttribute('data-endpoint', 'http://localhost:4747')
    })
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

    expect(screen.getByTestId('mobile-shell')).toHaveClass('h-[100dvh]', 'min-h-[100dvh]', 'overflow-hidden')
    expect(screen.getByTestId('mobile-shell')).toHaveStyle({
      height: 'var(--nurimap-viewport-height, 100dvh)',
      minHeight: 'var(--nurimap-viewport-height, 100dvh)',
    })
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument()
    expect(screen.getByTestId('map-canvas')).toHaveClass('h-full', 'min-h-0')
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toHaveClass('fixed')
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toHaveStyle({
      paddingBottom: 'var(--nurimap-effective-bottom-inset, 0px)',
    })
    expect(screen.getByTestId('mobile-bottom-tab-bar')).toHaveClass('h-14')
    expect(screen.getByTestId('mobile-bottom-tab-bar').className).not.toContain('shadow-[')
    expect(screen.getByTestId('mobile-bottom-tab-bar').className).toContain('before:bg-[#f0f0f0]')
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
    expect(screen.getByTestId('mobile-list-header')).toContainElement(screen.getByAltText('Nurimedia 로고'))
    expect(screen.getByTestId('mobile-list-header-content')).toHaveClass('pl-6', 'pr-5', 'pt-6', 'pb-4')
    expect(screen.getByTestId('mobile-list-header')).toHaveStyle({
      paddingTop: 'var(--nurimap-effective-top-inset, 0px)',
    })
    expect(screen.getByTestId('mobile-list-header').className).not.toContain('border-b')
    expect(screen.getByTestId('mobile-list-page')).toHaveTextContent('누리맵')
    expect(screen.getByTestId('mobile-list-page')).toHaveClass('h-full', 'min-h-0', 'overflow-hidden', 'pb-14')
    expect(screen.getByTestId('mobile-list-page')).toHaveStyle({
      paddingBottom: 'calc(56px + var(--nurimap-effective-bottom-inset, 0px))',
    })
    expect(screen.getByTestId('mobile-list-scroll-region')).toHaveClass('overflow-y-auto', 'overscroll-contain')
    expect(screen.getByTestId('mobile-list-logout-button')).toHaveAccessibleName('로그아웃')
    expect(screen.getByTestId('mobile-list-logout-button')).toHaveClass('h-6', 'w-6')
    expect(screen.getByTestId('mobile-list-logout-button').className).not.toContain('border')
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

  it('locks document scroll for the mobile shell and restores it on unmount', () => {
    setViewport(390)
    const { unmount } = render(<App />)

    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.overscrollBehavior).toBe('none')
    expect(document.documentElement.style.getPropertyValue('--nurimap-viewport-height')).toBe('844px')

    unmount()

    expect(document.documentElement.style.overflow).toBe('')
    expect(document.body.style.overflow).toBe('')
    expect(document.body.style.overscrollBehavior).toBe('')
  })

  it('hydrates safe-area viewport variables from visualViewport metrics for embedded webviews', () => {
    const originalVisualViewport = window.visualViewport
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()

    setViewport(390, 844)
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 780,
        offsetTop: 24,
        addEventListener,
        removeEventListener,
      },
    })

    const { unmount } = render(<App />)

    expect(document.documentElement.style.getPropertyValue('--nurimap-viewport-height')).toBe('780px')
    expect(document.documentElement.style.getPropertyValue('--nurimap-viewport-offset-top')).toBe('24px')
    expect(document.documentElement.style.getPropertyValue('--nurimap-viewport-offset-bottom')).toBe('40px')
    expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function))

    unmount()
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: originalVisualViewport,
    })
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

})
