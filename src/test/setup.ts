import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { resetAppShellStore } from '../app-shell/appShellStore'
import { resetTestAuthState } from '../auth/testAuthState'

afterEach(() => {
  cleanup()
  resetAppShellStore()
  resetTestAuthState()
})
