import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  __resetDatabasePoolForTests,
  resolveDatabaseConnectionString,
  shouldUseDatabaseSsl,
} from './database'

describe('database foundation', () => {
  afterEach(async () => {
    await __resetDatabasePoolForTests()
    vi.unstubAllEnvs()
  })

  it('prefers dedicated test database url in test mode', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATABASE_URL', 'postgres://runtime-user:runtime-pass@db.example.com:5432/postgres')
    vi.stubEnv('TEST_DATABASE_URL', 'postgres://test-user:test-pass@127.0.0.1:54322/postgres')

    expect(resolveDatabaseConnectionString()).toBe('postgres://test-user:test-pass@127.0.0.1:54322/postgres')
  })

  it('falls back to runtime database url outside test mode', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URL', 'postgres://runtime-user:runtime-pass@db.example.com:5432/postgres')

    expect(resolveDatabaseConnectionString()).toBe('postgres://runtime-user:runtime-pass@db.example.com:5432/postgres')
  })

  it('disables ssl for localhost-style connections', () => {
    expect(shouldUseDatabaseSsl('postgres://postgres:postgres@127.0.0.1:54322/postgres')).toBe(false)
    expect(shouldUseDatabaseSsl('postgres://postgres:postgres@localhost:54322/postgres')).toBe(false)
  })

  it('enables ssl for non-local hosts', () => {
    expect(shouldUseDatabaseSsl('postgres://postgres:postgres@db.example.com:5432/postgres')).toBe(true)
  })
})
