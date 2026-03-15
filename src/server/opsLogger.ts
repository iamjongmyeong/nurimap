const maskEmail = (email: string) => {
  const normalized = email.trim().toLowerCase()
  const [localPart, domain] = normalized.split('@')

  if (!localPart || !domain) {
    return 'invalid-email'
  }

  const visible = localPart.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(1, localPart.length - visible.length))}@${domain}`
}

const writeLog = (level: 'info' | 'warn' | 'error', event: string, details: Record<string, unknown>) => {
  console[level](`[ops] ${event}`, details)
}

export const logAuthBypassLogin = ({ email }: { email: string }) => {
  writeLog('warn', 'auth.request_link.bypass_login', {
    email: maskEmail(email),
  })
}

export const logAuthRequestAccepted = ({
  email,
  providerMessageId,
  providerStatusCode,
  timings,
}: {
  email: string
  providerMessageId: string | null
  providerStatusCode: number
  timings: {
    findUserMs: number
    generateLinkMs: number
    persistStateMs: number
    sendEmailMs: number
    totalMs: number
  }
}) => {
  writeLog('info', 'auth.request_link.accepted', {
    email: maskEmail(email),
    provider: 'resend',
    provider_message_id: providerMessageId,
    provider_status_code: providerStatusCode,
    find_user_ms: timings.findUserMs,
    generate_link_ms: timings.generateLinkMs,
    persist_state_ms: timings.persistStateMs,
    send_email_ms: timings.sendEmailMs,
    total_ms: timings.totalMs,
  })
}

export const logAuthRequestFailure = ({
  code,
  email,
  details = {},
}: {
  code: string
  email: string
  details?: Record<string, unknown>
}) => {
  writeLog('warn', `auth.request_link.${code}`, {
    email: maskEmail(email),
    ...details,
  })
}


export const logAuthConsumeFailure = ({
  email,
  reason,
}: {
  email: string
  reason: string
}) => {
  writeLog('warn', 'auth.consume_link.failed', {
    email: maskEmail(email),
    reason,
  })
}

export const logPlaceEntryFailure = ({
  code,
  details = {},
}: {
  code: string
  details?: Record<string, unknown>
}) => {
  writeLog('error', `place_entry.${code}`, details)
}

export const logPlaceLookupFailure = ({
  code,
  naverPlaceId,
  rawUrl,
}: {
  code: string
  naverPlaceId?: string | null
  rawUrl: string
}) => {
  writeLog('warn', `place_lookup.${code}`, {
    naver_place_id: naverPlaceId ?? null,
    raw_url: rawUrl,
  })
}
