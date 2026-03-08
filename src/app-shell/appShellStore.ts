import { create } from 'zustand'
import { DEFAULT_SELECTED_PLACE_ID } from './mockPlaces'

export type NavigationState =
  | 'map_browse'
  | 'mobile_place_list_open'
  | 'place_add_open'
  | 'place_detail_open'

export type PlaceListLoadState = 'idle' | 'loading' | 'empty' | 'ready' | 'error'
export type PlaceDetailLoadState = 'idle' | 'loading' | 'ready' | 'error'

type AppShellState = {
  navigationState: NavigationState
  placeListLoad: PlaceListLoadState
  placeDetailLoad: PlaceDetailLoadState
  selectedPlaceId: string | null
  mapLevel: number
  openMobilePlaceList: () => void
  openPlaceAdd: () => void
  openPlaceDetail: (placeId: string) => void
  closePlaceDetail: () => void
  returnToMapBrowse: () => void
  setPlaceListLoad: (status: PlaceListLoadState) => void
  setPlaceDetailLoad: (status: PlaceDetailLoadState) => void
  setMapLevel: (level: number) => void
  retryPlaceList: () => void
  retryPlaceDetail: () => void
  reset: () => void
}

const initialState = {
  navigationState: 'map_browse' as NavigationState,
  placeListLoad: 'ready' as PlaceListLoadState,
  placeDetailLoad: 'ready' as PlaceDetailLoadState,
  selectedPlaceId: DEFAULT_SELECTED_PLACE_ID,
  mapLevel: 5,
}

export const useAppShellStore = create<AppShellState>((set) => ({
  ...initialState,
  openMobilePlaceList: () => set({ navigationState: 'mobile_place_list_open' }),
  openPlaceAdd: () => set({ navigationState: 'place_add_open' }),
  openPlaceDetail: (placeId) =>
    set({
      navigationState: 'place_detail_open',
      placeDetailLoad: 'ready',
      selectedPlaceId: placeId,
    }),
  closePlaceDetail: () => set({ navigationState: 'map_browse' }),
  returnToMapBrowse: () => set({ navigationState: 'map_browse' }),
  setPlaceListLoad: (placeListLoad) => set({ placeListLoad }),
  setPlaceDetailLoad: (placeDetailLoad) => set({ placeDetailLoad }),
  setMapLevel: (mapLevel) => set({ mapLevel }),
  retryPlaceList: () => set({ placeListLoad: 'ready' }),
  retryPlaceDetail: () => set({ placeDetailLoad: 'ready' }),
  reset: () => set(initialState),
}))

export const resetAppShellStore = () => {
  useAppShellStore.getState().reset()
}
