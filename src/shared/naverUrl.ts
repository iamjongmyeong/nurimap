const INVALID_URL_MESSAGE = '네이버 지도 URL을 입력해주세요.'
const PLACE_ID_EXTRACTION_ERROR_MESSAGE = '장소 정보를 찾지 못했어요. 다른 네이버 지도 URL을 입력해 주세요.'

const SUPPORTED_NAVER_MAP_HOSTS = new Set([
  'map.naver.com',
  'm.place.naver.com',
])

export type NormalizedNaverMapUrl = {
  canonicalUrl: string
  naverPlaceId: string
}

const explicitPlacePathPattern = /(?:^|\/)(?:place|restaurant|hotel|attraction)\/(\d+)(?:\/|$)/i

const normalizePathname = (pathname: string) =>
  pathname
    .replace(/\/+$/u, '')
    .trim()

const extractPlaceIdFromPathname = (pathname: string) => {
  const normalizedPathname = normalizePathname(pathname)
  if (!normalizedPathname) {
    return null
  }

  const explicitMatch = normalizedPathname.match(explicitPlacePathPattern)?.[1]
  if (explicitMatch) {
    return explicitMatch
  }

  const segments = normalizedPathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.trim())

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index]
    if (/^\d+$/u.test(segment)) {
      return segment
    }
  }

  return null
}

export const normalizeNaverMapUrl = (rawUrl: string): NormalizedNaverMapUrl => {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    throw new Error(INVALID_URL_MESSAGE)
  }

  if (!SUPPORTED_NAVER_MAP_HOSTS.has(parsedUrl.hostname)) {
    throw new Error(INVALID_URL_MESSAGE)
  }

  const normalizedPathname = normalizePathname(parsedUrl.pathname)
  const decodedPathname = (() => {
    try {
      return decodeURIComponent(normalizedPathname)
    } catch {
      return normalizedPathname
    }
  })()
  const placeId = extractPlaceIdFromPathname(normalizedPathname)
    ?? extractPlaceIdFromPathname(decodedPathname)

  if (!placeId) {
    throw new Error(PLACE_ID_EXTRACTION_ERROR_MESSAGE)
  }

  return {
    canonicalUrl: `https://map.naver.com/p/entry/place/${placeId}`,
    naverPlaceId: placeId,
  }
}

export const NAVER_URL_ERROR_MESSAGE = INVALID_URL_MESSAGE
export const NAVER_PLACE_ID_ERROR_MESSAGE = PLACE_ID_EXTRACTION_ERROR_MESSAGE
