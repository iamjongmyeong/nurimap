import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AUTH_BOOTSTRAP_TIMEOUT_MS,
  GENERIC_AUTH_FAILURE_MESSAGE,
  resolveBypassVerification,
  withTimeout,
} from './authVerification'

describe('authVerification', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns auth failure when bypass verification never resolves', async () => {
    vi.spyOn(window, 'setTimeout').mockImplementation(((handler: TimerHandler) => {
      if (typeof handler === 'function') {
        handler()
      }
      return 1 as unknown as number
    }) as typeof window.setTimeout)
    const verifyAndAdoptSession = vi.fn(() => new Promise<never>(() => {}))
    await expect(resolveBypassVerification({
      tokenHash: 'bypass-token-hash',
      verificationType: 'magiclink',
      verifyAndAdoptSession,
    })).resolves.toEqual({
      status: 'error',
      message: GENERIC_AUTH_FAILURE_MESSAGE,
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

  it('rejects with an auth bootstrap timeout when verification exceeds the deadline', async () => {
    vi.spyOn(window, 'setTimeout').mockImplementation(((handler: TimerHandler) => {
      if (typeof handler === 'function') {
        handler()
      }
      return 1 as unknown as number
    }) as typeof window.setTimeout)

    await expect(withTimeout(new Promise<never>(() => {}), AUTH_BOOTSTRAP_TIMEOUT_MS)).rejects.toThrow(
      'auth_bootstrap_timeout',
    )
  })

  it('clears the bootstrap timeout after the wrapped verification resolves', async () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

    await expect(withTimeout(Promise.resolve({ status: 'success' as const }))).resolves.toEqual({
      status: 'success',
    })
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1)
  })
})
