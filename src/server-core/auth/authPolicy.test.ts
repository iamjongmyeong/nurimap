import { describe, expect, it } from 'vitest'
import {
  AUTH_REQUEST_BURST_LIMIT,
  AUTH_REQUEST_COOLDOWN_SECONDS,
  createEmptyLoginOtpState,
  evaluateRequestPolicy,
  isExplicitlyAllowedEmail,
  isAllowedEmailDomain,
  parseAllowedEmails,
  recordVerifiedOtpState,
} from './authPolicy'

describe('Sprint 18 auth policy', () => {
  it('allows only the configured email domain', () => {
    expect(isAllowedEmailDomain('user@nurimedia.co.kr', 'nurimedia.co.kr')).toBe(true)
    expect(isAllowedEmailDomain('user@example.com', 'nurimedia.co.kr')).toBe(false)
  })

  it('allows an exact email from the explicit allowlist', () => {
    const allowedEmails = parseAllowedEmails('allowed.user@example.com, allowed.named@example.com')

    expect(isExplicitlyAllowedEmail('Allowed.User@example.com', allowedEmails)).toBe(true)
    expect(isExplicitlyAllowedEmail('outside.user@example.com', allowedEmails)).toBe(false)
  })

  it('allows an otp resend burst up to 3 times before cooldown begins', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = {
      ...createEmptyLoginOtpState(),
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

  it('enforces cooldown on the 4th resend attempt within the active window', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const state = {
      ...createEmptyLoginOtpState(),
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
      ...createEmptyLoginOtpState(),
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

  it('records otp verification time without restoring legacy nonce fields', () => {
    const now = new Date('2026-03-08T10:00:00.000Z')
    const result = recordVerifiedOtpState({
      now,
      state: createEmptyLoginOtpState(),
    })

    expect(result).toEqual({
      day_key: '',
      day_count: 0,
      last_requested_at: null,
      last_verified_at: '2026-03-08T10:00:00.000Z',
      recent_request_receipts: [],
    })
  })
})
