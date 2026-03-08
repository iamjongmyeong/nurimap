import { create } from 'zustand'

export type NavigationState =
  | 'map_browse'
  | 'mobile_place_list_open'
  | 'place_add_open'
  | 'place_detail_open'

export type PlaceListLoadState = 'idle' | 'loading' | 'empty' | 'ready' | 'error'

type AppShellState = {
  navigationState: NavigationState
  placeListLoad: PlaceListLoadState
  openMobilePlaceList: () => void
  openPlaceAdd: () => void
  openPlaceDetail: () => void
  returnToMapBrowse: () => void
  reset: () => void
}

const initialState = {
  navigationState: 'map_browse' as NavigationState,
  placeListLoad: 'empty' as PlaceListLoadState,
}

export const useAppShellStore = create<AppShellState>((set) => ({
  ...initialState,
  openMobilePlaceList: () => set({ navigationState: 'mobile_place_list_open' }),
  openPlaceAdd: () => set({ navigationState: 'place_add_open' }),
  openPlaceDetail: () => set({ navigationState: 'place_detail_open' }),
  returnToMapBrowse: () => set({ navigationState: 'map_browse' }),
  reset: () => set(initialState),
}))

export const resetAppShellStore = () => {
  useAppShellStore.getState().reset()
}
