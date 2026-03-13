import { describe, expect, it } from 'vitest'
import {
  findFileMatches,
  findMetadataMatches,
  parseCommaSeparatedEmails,
  parseDenylistFromDotenv,
} from './guard-bypass-email.mjs'

describe('guard-bypass-email', () => {
  it('parses comma-separated denylist emails', () => {
    expect(parseCommaSeparatedEmails(' A@example.com, b@example.com ,,')).toEqual([
      'a@example.com',
      'b@example.com',
    ])
  })

  it('reads AUTH_BYPASS_EMAILS from dotenv content', () => {
    const dotenv = `
# comment
AUTH_BYPASS_ENABLED=true
AUTH_BYPASS_EMAILS=Bypass.User@example.com, bypass.named@example.com
`

    expect(parseDenylistFromDotenv(dotenv)).toEqual([
      'bypass.user@example.com',
      'bypass.named@example.com',
    ])
  })

  it('detects metadata matches without echoing the sensitive value', () => {
    const matches = findMetadataMatches(
      {
        git_config_user_email: 'safe@example.com',
        git_author_ident: 'User <bypass.user@example.com> 123 +0900',
      },
      ['bypass.user@example.com'],
    )

    expect(matches).toEqual(['git_author_ident'])
  })

  it('detects tracked content matches by file path', () => {
    const matches = findFileMatches(
      {
        'src/a.ts': 'const x = "safe@example.com"',
        'src/b.ts': 'const y = "bypass.user@example.com"',
      },
      ['bypass.user@example.com'],
    )

    expect(matches).toEqual(['src/b.ts'])
  })
})
