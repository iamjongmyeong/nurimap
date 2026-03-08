import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { resetTestAuthState, setTestAuthState } from './testAuthState'

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

describe('Plan 08 auth flow', () => {
  beforeEach(() => {
    resetTestAuthState()
  })

  it('blocks protected screens when unauthenticated', () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    render(<App />)

    expect(screen.getByRole('button', { name: '로그인 링크 받기' })).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
  })

  it('shows an inline error and keeps the email input for an invalid domain', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이메일')
    await user.type(input, 'user@example.com')
    await user.click(screen.getByRole('button', { name: '로그인 링크 받기' }))

    expect(await screen.findByText('허용된 회사 이메일만 사용할 수 있어요.')).toBeInTheDocument()
    expect(input).toHaveValue('user@example.com')
  })

  it('shows the cooldown inline error and keeps the email input', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이메일')
    await user.type(input, 'cooldown@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '로그인 링크 받기' }))

    expect(await screen.findByText('300초 후에 다시 시도해 주세요.')).toBeInTheDocument()
    expect(input).toHaveValue('cooldown@nurimedia.co.kr')
  })

  it('shows the daily limit inline error and keeps the email input', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByLabelText('이메일')
    await user.type(input, 'limit@nurimedia.co.kr')
    await user.click(screen.getByRole('button', { name: '로그인 링크 받기' }))

    expect(await screen.findByText('오늘은 더 이상 로그인 링크를 요청할 수 없어요.')).toBeInTheDocument()
    expect(input).toHaveValue('limit@nurimedia.co.kr')
  })

  it('disables the request button while requesting the login link', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'tester@nurimedia.co.kr')
    const button = screen.getByRole('button', { name: '로그인 링크 받기' })
    const clickPromise = user.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })

    await clickPromise
    expect(await screen.findByText('로그인 링크를 보냈어요.')).toBeInTheDocument()
  })

  it('immediately enters the onboarding flow for a bypass test account', async () => {
    setTestAuthState({ phase: 'auth_required', user: null, message: null, failureReason: null })
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('이메일'), 'bypass.user@example.com')
    await user.click(screen.getByTestId('auth-request-button'))

    expect(await screen.findByText('이름 입력')).toBeInTheDocument()
    expect(screen.queryByTestId('auth-request-button')).not.toBeInTheDocument()
  })

  it('shows the verifying state while processing the login link', () => {
    setTestAuthState({ phase: 'verifying', user: null, message: null, failureReason: null })
    render(<App />)

    expect(screen.getByText('로그인 링크를 확인하는 중입니다.')).toBeInTheDocument()
  })

  it('shows the auth failure screen CTA and returns to the login form', async () => {
    setTestAuthState({ phase: 'auth_failure', user: null, message: null, failureReason: 'expired' })
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('인증에 실패했어요')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '이메일 다시 입력' }))

    expect(await screen.findByRole('button', { name: '로그인 링크 받기' })).toBeInTheDocument()
  })

  it('shows the name capture screen for users without a name and requires at least one character', async () => {
    setTestAuthState({
      phase: 'name_required',
      user: { email: 'tester@nurimedia.co.kr', name: null },
      message: null,
      failureReason: null,
    })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '이름 저장' }))
    expect(screen.getByText('이름을 입력해 주세요.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('이름'), '김')
    await user.click(screen.getByRole('button', { name: '이름 저장' }))

    await waitFor(() => {
      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
    })
  })

  it('shows the authenticated app directly when the user already has a name', () => {
    setViewport(1280)
    render(<App />)

    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
  })

  it('blocks protected screens again after logout', async () => {
    setViewport(1280)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(await screen.findByRole('button', { name: '로그인 링크 받기' })).toBeInTheDocument()
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
  })
})
