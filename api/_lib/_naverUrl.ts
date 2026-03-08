const INVALID_URL_MESSAGE = '네이버 지도 URL을 입력해주세요.'

export type NormalizedNaverMapUrl = {
  canonicalUrl: string
  naverPlaceId: string
}

const supportedPathPatterns = [
  /^\/p\/search\/.*\/place\/(\d+)(?:\/|$)/,
  /^\/p\/entry\/place\/(\d+)(?:\/|$)/,
]

export const normalizeNaverMapUrl = (rawUrl: string): NormalizedNaverMapUrl => {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    throw new Error(INVALID_URL_MESSAGE)
  }

  if (parsedUrl.hostname !== 'map.naver.com') {
    throw new Error(INVALID_URL_MESSAGE)
  }

  const matchedPattern = supportedPathPatterns
    .map((pattern) => parsedUrl.pathname.match(pattern))
    .find(Boolean)

  const placeId = matchedPattern?.[1]

  if (!placeId) {
    throw new Error(INVALID_URL_MESSAGE)
  }

  return {
    canonicalUrl: `https://map.naver.com/p/entry/place/${placeId}`,
    naverPlaceId: placeId,
  }
}

export const NAVER_URL_ERROR_MESSAGE = INVALID_URL_MESSAGE
