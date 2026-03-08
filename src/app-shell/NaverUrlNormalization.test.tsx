import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { resetAppShellStore } from './appShellStore'
import { NAVER_URL_ERROR_MESSAGE, normalizeNaverMapUrl } from './naverUrl'

const validSearchUrl = 'https://map.naver.com/p/search/%EC%B9%B4%ED%8E%98/place/123456789?c=15.00,0,0,0,dh'
const validEntryUrl = 'https://map.naver.com/p/entry/place/987654321?placePath=%2Fhome'

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

describe('Plan 04 naver url normalization', () => {
  beforeEach(() => {
    resetAppShellStore()
  })

  it('recognizes the search place url shape', () => {
    expect(normalizeNaverMapUrl(validSearchUrl)).toEqual({
      canonicalUrl: 'https://map.naver.com/p/entry/place/123456789',
      naverPlaceId: '123456789',
    })
  })

  it('recognizes the entry place url shape', () => {
    expect(normalizeNaverMapUrl(validEntryUrl)).toEqual({
      canonicalUrl: 'https://map.naver.com/p/entry/place/987654321',
      naverPlaceId: '987654321',
    })
  })

  it('rejects a non-naver host', () => {
    expect(() => normalizeNaverMapUrl('https://example.com/p/entry/place/123')).toThrow(
      NAVER_URL_ERROR_MESSAGE,
    )
  })

  it('fails when the place id is missing', () => {
    expect(() => normalizeNaverMapUrl('https://map.naver.com/p/entry/place/')).toThrow(
      NAVER_URL_ERROR_MESSAGE,
    )
  })

  it('shows the inline error for an invalid url and keeps the input value', async () => {
    const user = userEvent.setup()
    setViewport(1280)
    render(<App />)

    await user.click(screen.getByRole('button', { name: '장소 추가' }))
    const input = screen.getByLabelText('네이버 지도 URL')
    await user.type(input, 'https://example.com/p/entry/place/123')
    await user.click(screen.getByRole('button', { name: 'URL 확인' }))

    expect(screen.getByText(NAVER_URL_ERROR_MESSAGE)).toBeInTheDocument()
    expect(input).toHaveValue('https://example.com/p/entry/place/123')
  })
})
