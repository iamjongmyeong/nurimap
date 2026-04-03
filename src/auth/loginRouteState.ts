export const LOGIN_ROUTE = '/login'
export const LOGIN_RETURN_BROWSE_NAVIGATION_STATE_FIELD = 'loginReturnBrowseNavigationState'

export type LoginEntryKind = 'direct' | 'explicit' | 'write_intent'

export type LoginRouteHistoryState = {
  loginEntryKind: LoginEntryKind
  loginPostAuthPath?: string
  loginPostAuthState?: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object'

const isSafeAppPath = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false
  }

  return value.startsWith('/') && !value.startsWith('//')
}

const stripLoginRouteFields = (state: Record<string, unknown>) => {
  const nextState = { ...state }

  delete nextState.loginEntryKind
  delete nextState.loginPostAuthPath
  delete nextState.loginPostAuthState

  return nextState
}

export const buildLoginRouteHistoryState = ({
  entryKind,
  postAuthPath,
  postAuthState,
}: {
  entryKind: LoginEntryKind
  postAuthPath?: string
  postAuthState?: Record<string, unknown>
}): LoginRouteHistoryState => ({
  loginEntryKind: entryKind,
  ...(postAuthPath ? { loginPostAuthPath: postAuthPath } : {}),
  ...(postAuthState ? { loginPostAuthState: stripLoginRouteFields(postAuthState) } : {}),
})

export const readLoginRouteHistoryState = (state: unknown): LoginRouteHistoryState | null => {
  if (!isRecord(state)) {
    return null
  }

  const entryKind = state.loginEntryKind
  if (entryKind !== 'direct' && entryKind !== 'explicit' && entryKind !== 'write_intent') {
    return null
  }

  return {
    loginEntryKind: entryKind,
    ...(isSafeAppPath(state.loginPostAuthPath) ? { loginPostAuthPath: state.loginPostAuthPath } : {}),
    ...(isRecord(state.loginPostAuthState) ? { loginPostAuthState: state.loginPostAuthState } : {}),
  }
}

export const isLoginRoutePathname = (pathname: string) => pathname === LOGIN_ROUTE

export const readLoginReturnBrowseNavigationStateFromHistoryState = (state: unknown) => {
  if (!isRecord(state)) {
    return null
  }

  const browseNavigationState = state[LOGIN_RETURN_BROWSE_NAVIGATION_STATE_FIELD]

  return browseNavigationState === 'map_browse' || browseNavigationState === 'mobile_place_list_open'
    ? browseNavigationState
    : null
}
