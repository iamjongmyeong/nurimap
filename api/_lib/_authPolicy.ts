export const AUTH_REQUEST_COOLDOWN_SECONDS = 60 * 5
export const AUTH_REQUEST_BURST_LIMIT = 3
export const AUTH_REQUEST_RECEIPT_TTL_MS = AUTH_REQUEST_COOLDOWN_SECONDS * 1000

export type LoginOtpRequestReceipt = {
  attempt_id: string
  status: 'accepted' | 'rejected'
  recorded_at: string
  error_code: 'cooldown' | 'invalid_domain' | 'delivery_failed' | 'bypass_required' | null
}

export type LoginOtpState = {
  day_key: string
  day_count: number
  last_requested_at: string | null
  last_verified_at: string | null
  recent_request_receipts: LoginOtpRequestReceipt[]
}

export const createEmptyLoginOtpState = (): LoginOtpState => ({
  day_key: '',
  day_count: 0,
  last_requested_at: null,
  last_verified_at: null,
  recent_request_receipts: [],
})

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const isAllowedEmailDomain = (email: string, allowedDomain: string) => {
  const normalizedEmail = normalizeEmail(email)
  return normalizedEmail.endsWith(`@${allowedDomain.toLowerCase()}`)
}

export const parseAllowedEmails = (value: string) =>
  value
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean)

export const isExplicitlyAllowedEmail = (email: string, allowedEmails: readonly string[]) =>
  allowedEmails.includes(normalizeEmail(email))

export const getDayKey = (date: Date) => date.toISOString().slice(0, 10)

export const evaluateRequestPolicy = ({
  now,
  state,
}: {
  now: Date
  state: LoginOtpState
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

export const recordVerifiedOtpState = ({
  now,
  state,
}: {
  now: Date
  state: LoginOtpState
}): LoginOtpState => ({
  ...state,
  last_verified_at: now.toISOString(),
})

const trimRecentRequestReceipts = (receipts: LoginOtpRequestReceipt[]) => {
  const deduped = receipts.filter((receipt, index, list) =>
    list.findIndex((candidate) => candidate.attempt_id === receipt.attempt_id) === index)

  return deduped.slice(0, AUTH_REQUEST_BURST_LIMIT)
}

export const recordRequestAttemptReceipt = ({
  state,
  receipt,
}: {
  state: LoginOtpState
  receipt: LoginOtpRequestReceipt
}): LoginOtpState => ({
  ...state,
  recent_request_receipts: trimRecentRequestReceipts([
    receipt,
    ...state.recent_request_receipts,
  ]),
})

export const findRequestAttemptReceipt = ({
  state,
  attemptId,
  now,
}: {
  state: LoginOtpState
  attemptId: string
  now: Date
}) => state.recent_request_receipts.find((receipt) =>
  receipt.attempt_id === attemptId &&
  now.getTime() - Date.parse(receipt.recorded_at) <= AUTH_REQUEST_RECEIPT_TTL_MS)
