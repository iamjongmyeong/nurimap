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

describe('Plan 05 place lookup flow', () => {
  beforeEach(() => {
    resetAppShellStore()
    globalThis.fetch = originalFetch
  })

  it('shows the read-only place summary after a successful lookup', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: 'success',
          data: {
            naver_place_id: '123456789',
            canonical_url: 'https://map.naver.com/p/entry/place/123456789',
            name: '누리 테스트 식당',
            road_address: '서울 마포구 양화로19길 22-16',
            land_lot_address: '서울 마포구 서교동 368-22',
            representative_address: '서울 마포구 양화로19길 22-16',
            latitude: 37.558721,
            longitude: 126.92444,
            coordinate_source: 'naver',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch

    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await user.type(screen.getByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))

    expect(await screen.findByTestId('place-lookup-summary')).toHaveTextContent('누리 테스트 식당')
    expect(screen.getByTestId('place-lookup-summary')).toHaveTextContent('서울 마포구 양화로19길 22-16')
  })

  it('shows the loading state while the lookup is in progress', async () => {
    let resolveResponse!: (response: Response) => void
    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    ) as typeof fetch

    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await user.type(screen.getByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))

    expect(screen.getByTestId('place-lookup-loading')).toBeInTheDocument()

    resolveResponse(
      new Response(
        JSON.stringify({
          status: 'success',
          data: {
            naver_place_id: '123456789',
            canonical_url: 'https://map.naver.com/p/entry/place/123456789',
            name: '누리 테스트 식당',
            road_address: '서울 마포구 양화로19길 22-16',
            land_lot_address: null,
            representative_address: '서울 마포구 양화로19길 22-16',
            latitude: 37.558721,
            longitude: 126.92444,
            coordinate_source: 'naver',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await screen.findByTestId('place-lookup-summary')
  })

  it('shows a failure modal when the lookup itself fails', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: 'error',
          error: { code: 'lookup_failed', message: '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.' },
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch

    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await user.type(screen.getByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/456789012')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))

    expect(await screen.findByTestId('place-lookup-error-modal')).toBeInTheDocument()
  })

  it('shows a failure modal when coordinates cannot be resolved', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: 'error',
          error: { code: 'coordinates_unavailable', message: '좌표를 확인하지 못했어요. 다시 시도해 주세요.' },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch

    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await user.type(screen.getByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/567890123')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))

    expect(await screen.findByTestId('place-lookup-error-modal')).toBeInTheDocument()
    expect(screen.getByText('좌표를 확인하지 못했어요. 다시 시도해 주세요.')).toBeInTheDocument()
  })

  it('keeps the entered url after a lookup failure', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: 'error',
          error: { code: 'lookup_failed', message: '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.' },
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch

    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    const input = screen.getByLabelText('네이버 지도 URL')
    await user.type(input, 'https://map.naver.com/p/entry/place/456789012')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))

    await screen.findByTestId('place-lookup-error-modal')
    expect(input).toHaveValue('https://map.naver.com/p/entry/place/456789012')
  })

  it('prevents duplicate lookup submissions while loading', async () => {
    let resolveResponse!: (response: Response) => void
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve
        }),
    ) as typeof fetch
    globalThis.fetch = fetchMock

    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await user.type(screen.getByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    const submitButton = screen.getByRole('button', { name: 'URL 확인' })
    await user.click(submitButton)
    await user.click(submitButton)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(submitButton).toBeDisabled()

    resolveResponse(
      new Response(
        JSON.stringify({
          status: 'success',
          data: {
            naver_place_id: '123456789',
            canonical_url: 'https://map.naver.com/p/entry/place/123456789',
            name: '누리 테스트 식당',
            road_address: '서울 마포구 양화로19길 22-16',
            land_lot_address: null,
            representative_address: '서울 마포구 양화로19길 22-16',
            latitude: 37.558721,
            longitude: 126.92444,
            coordinate_source: 'naver',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await screen.findByTestId('place-lookup-summary')
  })

  it('retries the same url from the failure modal', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'error',
            error: { code: 'lookup_failed', message: '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.' },
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'success',
            data: {
              naver_place_id: '123456789',
              canonical_url: 'https://map.naver.com/p/entry/place/123456789',
              name: '누리 테스트 식당',
              road_address: '서울 마포구 양화로19길 22-16',
              land_lot_address: null,
              representative_address: '서울 마포구 양화로19길 22-16',
              latitude: 37.558721,
              longitude: 126.92444,
              coordinate_source: 'naver',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ) as typeof fetch
    globalThis.fetch = fetchMock

    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    await user.type(screen.getByLabelText('네이버 지도 URL'), 'https://map.naver.com/p/entry/place/123456789')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))
    await user.click(await screen.findByRole('button', { name: '다시 시도' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByTestId('place-lookup-summary')).toBeInTheDocument()
  })
})
