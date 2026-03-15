import { describe, expect, it } from 'vitest'
import {
  AUTH_REQUEST_BURST_LIMIT,
  AUTH_REQUEST_COOLDOWN_SECONDS,
  buildIssuedLoginLinkState,
  consumeVerificationState,
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

  it('allows a resend burst up to 5 times before cooldown begins', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = {
      ...createEmptyLoginLinkState(),
      last_requested_at: new Date(now.getTime() - 10 * 1000).toISOString(),
      day_key: '2026-03-08',
      day_count: AUTH_REQUEST_BURST_LIMIT - 1,
    }

    const result = evaluateRequestPolicy({ now, state })
    expect(result.allowed).toBe(true)
    expect(result.reason).toBeNull()
    if (result.allowed) {
      expect(result.nextState.day_count).toBe(AUTH_REQUEST_BURST_LIMIT)
    }
  })

  it('enforces cooldown on the 6th resend attempt within the active window', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = {
      ...createEmptyLoginLinkState(),
      last_requested_at: new Date(now.getTime() - 10 * 1000).toISOString(),
      day_key: '2026-03-08',
      day_count: AUTH_REQUEST_BURST_LIMIT,
    }

    const result = evaluateRequestPolicy({ now, state })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('cooldown')
    expect(result.remainingSeconds).toBeGreaterThan(0)
  })

  it('resets the resend burst after the cooldown window elapses', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = {
      ...createEmptyLoginLinkState(),
      last_requested_at: new Date(now.getTime() - (AUTH_REQUEST_COOLDOWN_SECONDS + 1) * 1000).toISOString(),
      day_key: '2026-03-08',
      day_count: AUTH_REQUEST_BURST_LIMIT,
    }

    const result = evaluateRequestPolicy({ now, state })
    expect(result.allowed).toBe(true)
    expect(result.reason).toBeNull()
    if (result.allowed) {
      expect(result.nextState.day_count).toBe(1)
    }
  })

  it('keeps a fresh link reusable until consumption is finalized', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = buildIssuedLoginLinkState({
      baseState: createEmptyLoginLinkState(),
      now,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      nonce: 'nonce-1',
      tokenHash: 'token-hash',
      verificationType: 'magiclink',
    })

    const firstResult = evaluateVerificationState({ nonce: 'nonce-1', now, state })
    const secondResult = evaluateVerificationState({ nonce: 'nonce-1', now, state })

    expect(firstResult.status).toBe('valid')
    expect(secondResult.status).toBe('valid')
    if (secondResult.status === 'valid') {
      expect(secondResult.tokenHash).toBe('token-hash')
      expect(secondResult.verificationType).toBe('magiclink')
    }
  })

  it('marks a valid link as consumed only after finalization', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = buildIssuedLoginLinkState({
      baseState: createEmptyLoginLinkState(),
      now,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      nonce: 'nonce-1',
      tokenHash: 'token-hash',
      verificationType: 'magiclink',
    })

    const result = consumeVerificationState({ nonce: 'nonce-1', state })

    expect(result.status).toBe('consumed')
    if (result.status === 'consumed') {
      expect(result.nextState.last_consumed_nonce).toBe('nonce-1')
      expect(result.nextState.active_nonce).toBeNull()
      expect(result.nextState.active_token_hash).toBeNull()
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
