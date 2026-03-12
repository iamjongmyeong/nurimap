import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUTH_BOOTSTRAP_TIMEOUT_MS, resolveBypassVerification } from './authVerification'

describe('authVerification', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns auth failure when bypass verification never resolves', async () => {
    vi.useFakeTimers()

    const verifyAndAdoptSession = vi.fn(() => new Promise<never>(() => {}))
    const verificationPromise = resolveBypassVerification({
      tokenHash: 'bypass-token-hash',
      verificationType: 'magiclink',
      verifyAndAdoptSession,
    })

    await vi.advanceTimersByTimeAsync(AUTH_BOOTSTRAP_TIMEOUT_MS)

    await expect(verificationPromise).resolves.toEqual({
      status: 'error',
      message: '인증에 실패했어요.',
    })
  })

  it('returns the verification result when bypass verification succeeds promptly', async () => {
    const verifyAndAdoptSession = vi.fn().mockResolvedValue({ status: 'success' })

    await expect(
      resolveBypassVerification({
        tokenHash: 'bypass-token-hash',
        verificationType: 'magiclink',
        verifyAndAdoptSession,
      }),
    ).resolves.toEqual({ status: 'success' })
  })
})
