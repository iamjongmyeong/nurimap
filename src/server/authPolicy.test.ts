import { describe, expect, it } from 'vitest'
import {
  AUTH_REQUEST_COOLDOWN_SECONDS,
  buildIssuedLoginLinkState,
  createEmptyLoginLinkState,
  evaluateRequestPolicy,
  evaluateVerificationState,
  isAllowedEmailDomain,
} from './authPolicy'

describe('Plan 08 auth policy', () => {
  it('allows only the configured email domain', () => {
    expect(isAllowedEmailDomain('user@nurimedia.co.kr', 'nurimedia.co.kr')).toBe(true)
    expect(isAllowedEmailDomain('user@example.com', 'nurimedia.co.kr')).toBe(false)
  })

  it('enforces the 5 minute cooldown', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = {
      ...createEmptyLoginLinkState(),
      last_requested_at: new Date(now.getTime() - (AUTH_REQUEST_COOLDOWN_SECONDS - 10) * 1000).toISOString(),
      day_key: '2026-03-08',
      day_count: 1,
    }

    const result = evaluateRequestPolicy({ now, state })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('cooldown')
  })

  it('enforces the daily request limit', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = {
      ...createEmptyLoginLinkState(),
      day_key: '2026-03-08',
      day_count: 5,
    }

    const result = evaluateRequestPolicy({ now, state })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('daily_limit')
  })

  it('marks a valid link as consumed after verification', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = buildIssuedLoginLinkState({
      baseState: createEmptyLoginLinkState(),
      now,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      nonce: 'nonce-1',
      tokenHash: 'token-hash',
      verificationType: 'magiclink',
    })

    const result = evaluateVerificationState({ nonce: 'nonce-1', now, state })
    expect(result.status).toBe('valid')
    if (result.status === 'valid') {
      expect(result.tokenHash).toBe('token-hash')
      expect(result.nextState.last_consumed_nonce).toBe('nonce-1')
    }
  })

  it('treats a different nonce as invalidated', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = buildIssuedLoginLinkState({
      baseState: createEmptyLoginLinkState(),
      now,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      nonce: 'nonce-1',
      tokenHash: 'token-hash',
      verificationType: 'magiclink',
    })

    const result = evaluateVerificationState({ nonce: 'nonce-2', now, state })
    expect(result.status).toBe('invalidated')
  })

  it('treats an expired link as expired', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = buildIssuedLoginLinkState({
      baseState: createEmptyLoginLinkState(),
      now: new Date('2026-03-08T09:50:00.000Z'),
      expiresAt: new Date('2026-03-08T09:55:00.000Z'),
      nonce: 'expired-nonce',
      tokenHash: 'token-hash',
      verificationType: 'magiclink',
    })

    const result = evaluateVerificationState({ nonce: 'expired-nonce', now, state })
    expect(result.status).toBe('expired')
  })

  it('treats an already consumed link as used', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = {
      ...createEmptyLoginLinkState(),
      last_consumed_nonce: 'used-nonce',
    }

    const result = evaluateVerificationState({ nonce: 'used-nonce', now, state })
    expect(result.status).toBe('used')
  })
})
