import { describe, expect, it } from 'vitest'

import { getRequestRuntimeOrigin } from './requestOrigin'

describe('requestOrigin', () => {
  it('derives runtime origin from forwarded host + proto', () => {
    expect(
      getRequestRuntimeOrigin({
        'x-forwarded-host': 'nurimap.example.com',
        'x-forwarded-proto': 'https',
      }),
    ).toBe('https://nurimap.example.com')
  })

  it('ignores Origin and prefers host-derived runtime for same-origin dev requests', () => {
    expect(getRequestRuntimeOrigin({
      origin: 'https://attacker.example.com',
      host: '192.168.0.24:5173',
    })).toBe('http://192.168.0.24:5173')
  })

  it('falls back to a forwarded private-lan host when Origin is missing', () => {
    expect(
      getRequestRuntimeOrigin({
        'x-forwarded-host': '10.20.30.40:5173',
        'x-forwarded-proto': 'http',
      }),
    ).toBe('http://10.20.30.40:5173')
  })

  it('uses the direct host header for private-lan requests when forwarded host is absent', () => {
    expect(getRequestRuntimeOrigin({ host: '172.16.8.4:4173' })).toBe('http://172.16.8.4:4173')
  })

  it('returns null when host headers are not usable even if Origin exists', () => {
    expect(getRequestRuntimeOrigin({
      origin: 'https://nurimap.example.com/app#fragment',
      host: '',
    })).toBeNull()
  })
})
