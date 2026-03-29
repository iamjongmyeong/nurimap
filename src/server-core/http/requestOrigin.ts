const getFirstHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost'])

const normalizeHostname = (hostname: string) => hostname.replace(/^\[(.*)\]$/, '$1').toLowerCase()

const isIpv4Literal = (hostname: string) => {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return false
  }

  return hostname
    .split('.')
    .every((segment) => {
      const numericSegment = Number(segment)
      return Number.isInteger(numericSegment) && numericSegment >= 0 && numericSegment <= 255
    })
}

const isPrivateLanIpv4Literal = (hostname: string) => {
  if (!isIpv4Literal(hostname)) {
    return false
  }

  const [firstOctet, secondOctet] = hostname.split('.').map(Number)

  return firstOctet === 10
    || (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31)
    || (firstOctet === 192 && secondOctet === 168)
}

export const normalizeHttpUrl = (rawValue: string | null | undefined) => {
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

export const isLoopbackOrPrivateLanRuntimeUrl = (runtimeUrl: string | null | undefined) => {
  const normalizedRuntimeUrl = normalizeHttpUrl(runtimeUrl)
  if (!normalizedRuntimeUrl) {
    return false
  }

  try {
    const hostname = normalizeHostname(new URL(normalizedRuntimeUrl).hostname)
    return LOOPBACK_HOSTS.has(hostname) || hostname.endsWith('.localhost') || isPrivateLanIpv4Literal(hostname)
  } catch {
    return false
  }
}

export const getRequestRuntimeOrigin = (headers: Record<string, string | string[] | undefined>) => {
  const hostHeader = getFirstHeaderValue(headers['x-forwarded-host']) ?? getFirstHeaderValue(headers.host)
  if (!hostHeader) {
    return null
  }

  const forwardedProtoHeader = getFirstHeaderValue(headers['x-forwarded-proto'])
  const protocol = forwardedProtoHeader?.split(',')[0]?.trim() || 'http'
  return normalizeHttpUrl(`${protocol}://${hostHeader}`)
}
