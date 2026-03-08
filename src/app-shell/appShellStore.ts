import { create } from 'zustand'
import { DEFAULT_SELECTED_PLACE_ID } from './mockPlaces'

export type NavigationState =
  | 'map_browse'
  | 'mobile_place_list_open'
  | 'place_add_open'
  | 'place_detail_open'

export type PlaceListLoadState = 'idle' | 'loading' | 'empty' | 'ready' | 'error'

type AppShellState = {
  navigationState: NavigationState
  placeListLoad: PlaceListLoadState
  selectedPlaceId: string | null
  mapLevel: number
  openMobilePlaceList: () => void
  openPlaceAdd: () => void
  openPlaceDetail: (placeId: string) => void
  returnToMapBrowse: () => void
  setPlaceListLoad: (status: PlaceListLoadState) => void
  setMapLevel: (level: number) => void
  retryPlaceList: () => void
  reset: () => void
}

const initialState = {
  navigationState: 'map_browse' as NavigationState,
  placeListLoad: 'ready' as PlaceListLoadState,
  selectedPlaceId: DEFAULT_SELECTED_PLACE_ID ?? null,
  mapLevel: 5,
}

export const useAppShellStore = create<AppShellState>((set) => ({
  ...initialState,
  openMobilePlaceList: () => set({ navigationState: 'mobile_place_list_open' }),
  openPlaceAdd: () => set({ navigationState: 'place_add_open' }),
  openPlaceDetail: (placeId) =>
    set({
      navigationState: 'place_detail_open',
      selectedPlaceId: placeId,
    }),
  returnToMapBrowse: () => set({ navigationState: 'map_browse' }),
  setPlaceListLoad: (placeListLoad) => set({ placeListLoad }),
  setMapLevel: (mapLevel) => set({ mapLevel }),
  retryPlaceList: () => set({ placeListLoad: 'ready' }),
  reset: () => set(initialState),
}))

export const resetAppShellStore = () => {
  useAppShellStore.getState().reset()
}
