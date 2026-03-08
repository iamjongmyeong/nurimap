const maskEmail = (email: string) => {
  const normalized = email.trim().toLowerCase()
  const [localPart, domain] = normalized.split('@')

  if (!localPart || !domain) {
    return 'invalid-email'
  }

  const visible = localPart.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(1, localPart.length - visible.length))}@${domain}`
}

const writeLog = (level: 'warn' | 'error', event: string, details: Record<string, unknown>) => {
  console[level](`[ops] ${event}`, details)
}

export const logAuthRequestFailure = ({
  code,
  email,
}: {
  code: string
  email: string
}) => {
  writeLog('warn', `auth.request_link.${code}`, {
    email: maskEmail(email),
  })
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
