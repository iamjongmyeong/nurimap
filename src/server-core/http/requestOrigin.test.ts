import { describe, expect, it } from 'vitest'

import { getRequestRuntimeOrigin } from './requestOrigin'

describe('requestOrigin', () => {
  it('prefers a valid Origin header', () => {
    expect(getRequestRuntimeOrigin({ origin: 'https://nurimap.example.com/app#fragment' })).toBe(
      'https://nurimap.example.com/app',
    )
  })

  it('falls back to forwarded host and proto when Origin is missing', () => {
    expect(
      getRequestRuntimeOrigin({
        'x-forwarded-host': 'nurimap.example.com',
        'x-forwarded-proto': 'https',
      }),
    ).toBe('https://nurimap.example.com')
  })

  it('returns null when neither origin nor host headers are usable', () => {
    expect(getRequestRuntimeOrigin({ host: '' })).toBeNull()
  })
})
