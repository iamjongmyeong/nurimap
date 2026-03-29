import { describe, expect, it } from 'vitest'
import { NAVER_PLACE_ID_ERROR_MESSAGE, NAVER_URL_ERROR_MESSAGE, normalizeNaverMapUrl } from './naverUrl'

const validSearchUrl = 'https://map.naver.com/p/search/%EC%B9%B4%ED%8E%98/place/123456789?c=15.00,0,0,0,dh'
const validEntryUrl = 'https://map.naver.com/p/entry/place/987654321?placePath=%2Fhome'
const validFavoriteUrl = 'https://map.naver.com/p/favorite/myPlace/folder/52f873516c87492794d35b0f62ebe0f1/place/1648359924?c=16.00,0,0,0,dh'
const validMobileUrl = 'https://m.place.naver.com/restaurant/38282260/home?entry=pll'
const validPinnedLocationUrl = 'https://map.naver.com/?menu=location&lat=37.5619497&pinType=site&app=Y&version=2&appMenu=location&lng=126.9246381&title=%EC%88%98%EB%9D%BC%EA%B0%84&pinId=1063954725'

describe('naverUrl normalization', () => {
  it('recognizes the search place url shape', () => {
    expect(normalizeNaverMapUrl(validSearchUrl)).toEqual({
      canonicalUrl: 'https://map.naver.com/p/entry/place/123456789',
      naverPlaceId: '123456789',
    })
  })

  it('recognizes the entry place url shape', () => {
    expect(normalizeNaverMapUrl(validEntryUrl)).toEqual({
      canonicalUrl: 'https://map.naver.com/p/entry/place/987654321',
      naverPlaceId: '987654321',
    })
  })

  it('recognizes the favorite place url shape', () => {
    expect(normalizeNaverMapUrl(validFavoriteUrl)).toEqual({
      canonicalUrl: 'https://map.naver.com/p/entry/place/1648359924',
      naverPlaceId: '1648359924',
    })
  })

  it('recognizes the mobile place url shape', () => {
    expect(normalizeNaverMapUrl(validMobileUrl)).toEqual({
      canonicalUrl: 'https://map.naver.com/p/entry/place/38282260',
      naverPlaceId: '38282260',
    })
  })

  it('recognizes the pinned location query url shape', () => {
    expect(normalizeNaverMapUrl(validPinnedLocationUrl)).toEqual({
      canonicalUrl: 'https://map.naver.com/p/entry/place/1063954725',
      naverPlaceId: '1063954725',
    })
  })

  it('rejects a non-naver host', () => {
    expect(() => normalizeNaverMapUrl('https://example.com/p/entry/place/123')).toThrow(
      NAVER_URL_ERROR_MESSAGE,
    )
  })

  it('fails when the place id is missing', () => {
    expect(() => normalizeNaverMapUrl('https://map.naver.com/p/entry/place/')).toThrow(
      NAVER_PLACE_ID_ERROR_MESSAGE,
    )
  })
})
