export const AUTH_REQUEST_COOLDOWN_SECONDS = 60 * 5
export const AUTH_REQUEST_BURST_LIMIT = 5
export const AUTH_LINK_EXPIRES_MINUTES = 5

export type LoginLinkState = {
  day_key: string
  day_count: number
  last_requested_at: string | null
  active_nonce: string | null
  active_token_hash: string | null
  active_verification_type: 'magiclink' | 'signup' | 'invite' | null
  active_expires_at: string | null
  last_consumed_nonce: string | null
}

export const createEmptyLoginLinkState = (): LoginLinkState => ({
  day_key: '',
  day_count: 0,
  last_requested_at: null,
  active_nonce: null,
  active_token_hash: null,
  active_verification_type: null,
  active_expires_at: null,
  last_consumed_nonce: null,
})

export const isAllowedEmailDomain = (email: string, allowedDomain: string) => {
  const normalizedEmail = email.trim().toLowerCase()
  return normalizedEmail.endsWith(`@${allowedDomain.toLowerCase()}`)
}

export const getDayKey = (date: Date) => date.toISOString().slice(0, 10)

export const evaluateRequestPolicy = ({
  now,
  state,
}: {
  now: Date
  state: LoginLinkState
}) => {
  const nowMs = now.getTime()
  const todayKey = getDayKey(now)
  const lastRequestedAtMs = state.last_requested_at ? Date.parse(state.last_requested_at) : null
  const hasActiveCooldownWindow = lastRequestedAtMs !== null && nowMs - lastRequestedAtMs < AUTH_REQUEST_COOLDOWN_SECONDS * 1000
  const burstCount = hasActiveCooldownWindow ? state.day_count : 0

  if (burstCount >= AUTH_REQUEST_BURST_LIMIT && lastRequestedAtMs !== null) {
    return {
      allowed: false as const,
      reason: 'cooldown' as const,
      remainingSeconds: Math.ceil((AUTH_REQUEST_COOLDOWN_SECONDS * 1000 - (nowMs - lastRequestedAtMs)) / 1000),
      nextState: state,
    }
  }

  return {
    allowed: true as const,
    reason: null,
    remainingSeconds: null,
    nextState: {
      ...state,
      day_key: todayKey,
      day_count: burstCount + 1,
      last_requested_at: now.toISOString(),
    },
  }
}

export const buildIssuedLoginLinkState = ({
  baseState,
  expiresAt,
  nonce,
  now,
  tokenHash,
  verificationType,
}: {
  baseState: LoginLinkState
  expiresAt: Date
  nonce: string
  now: Date
  tokenHash: string
  verificationType: 'magiclink' | 'signup' | 'invite'
}): LoginLinkState => ({
  ...baseState,
  last_requested_at: now.toISOString(),
  active_nonce: nonce,
  active_token_hash: tokenHash,
  active_verification_type: verificationType,
  active_expires_at: expiresAt.toISOString(),
})

export const evaluateVerificationState = ({
  nonce,
  now,
  state,
}: {
  nonce: string
  now: Date
  state: LoginLinkState
}) => {
  if (state.last_consumed_nonce === nonce) {
    return { status: 'used' as const }
  }

  if (!state.active_nonce || state.active_nonce !== nonce) {
    return { status: 'invalidated' as const }
  }

  if (!state.active_expires_at || Date.parse(state.active_expires_at) < now.getTime()) {
    return { status: 'expired' as const }
  }

  if (!state.active_token_hash || !state.active_verification_type) {
    return { status: 'invalidated' as const }
  }

  return {
    status: 'valid' as const,
    tokenHash: state.active_token_hash,
    verificationType: state.active_verification_type,
    nextState: {
      ...state,
      last_consumed_nonce: nonce,
      active_nonce: null,
      active_token_hash: null,
      active_verification_type: null,
      active_expires_at: null,
    },
  }
}
