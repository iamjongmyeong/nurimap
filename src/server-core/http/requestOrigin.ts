const getFirstHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

const normalizeHttpUrl = (rawValue: string | null | undefined) => {
  if (!rawValue) {
    return null
  }

  const trimmedValue = rawValue.trim()
  if (!trimmedValue) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedValue)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return null
    }

    if (parsedUrl.hash) {
      parsedUrl.hash = ''
    }

    const normalizedUrl = parsedUrl.toString()
    if (parsedUrl.pathname === '/' && !parsedUrl.search) {
      return normalizedUrl.replace(/\/$/, '')
    }

    return normalizedUrl
  } catch {
    return null
  }
}

export const getRequestRuntimeOrigin = (headers: Record<string, string | string[] | undefined>) => {
  const originHeader = getFirstHeaderValue(headers.origin)
  const normalizedOrigin = normalizeHttpUrl(originHeader)
  if (normalizedOrigin) {
    return normalizedOrigin
  }

  const hostHeader = getFirstHeaderValue(headers['x-forwarded-host']) ?? getFirstHeaderValue(headers.host)
  if (!hostHeader) {
    return null
  }

  const forwardedProtoHeader = getFirstHeaderValue(headers['x-forwarded-proto'])
  const protocol = forwardedProtoHeader?.split(',')[0]?.trim() || 'http'
  return normalizeHttpUrl(`${protocol}://${hostHeader}`)
}
