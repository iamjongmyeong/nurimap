import { create } from 'zustand'
import { createInitialPlaces, type PlaceRegistrationResult } from './placeRepository'
import { DEFAULT_SELECTED_PLACE_ID } from './mockPlaces'
import type { PlaceSummary } from './types'

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
  places: PlaceSummary[]
  registrationMessage: string | null
  openMobilePlaceList: () => void
  openPlaceAdd: () => void
  closePlaceAdd: () => void
  openPlaceDetail: (placeId: string) => void
  closePlaceDetail: () => void
  returnToMapBrowse: () => void
  setPlaceListLoad: (status: PlaceListLoadState) => void
  setPlaceDetailLoad: (status: PlaceDetailLoadState) => void
  setMapLevel: (level: number) => void
  setPlaces: (places: PlaceSummary[]) => void
  setRegistrationMessage: (message: string | null) => void
  applyRegistrationResult: (result: PlaceRegistrationResult) => void
  retryPlaceList: () => void
  retryPlaceDetail: () => void
  reset: () => void
}

const buildInitialState = () => ({
  navigationState: 'map_browse' as NavigationState,
  placeListLoad: 'ready' as PlaceListLoadState,
  placeDetailLoad: 'ready' as PlaceDetailLoadState,
  selectedPlaceId: DEFAULT_SELECTED_PLACE_ID,
  mapLevel: 5,
  places: createInitialPlaces(),
  registrationMessage: null,
})

export const useAppShellStore = create<AppShellState>((set) => ({
  ...buildInitialState(),
  openMobilePlaceList: () => set({ navigationState: 'mobile_place_list_open' }),
  openPlaceAdd: () => set({ navigationState: 'place_add_open', registrationMessage: null }),
  closePlaceAdd: () => set({ navigationState: 'map_browse' }),
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
  setPlaces: (places) => set({ places }),
  setRegistrationMessage: (registrationMessage) => set({ registrationMessage }),
  applyRegistrationResult: (result) =>
    set({
      places: result.places,
      selectedPlaceId: result.place.id,
      navigationState: 'place_detail_open',
      placeDetailLoad: 'ready',
      registrationMessage: result.message,
    }),
  retryPlaceList: () => set({ placeListLoad: 'ready' }),
  retryPlaceDetail: () => set({ placeDetailLoad: 'ready' }),
  reset: () => set(buildInitialState()),
}))

export const resetAppShellStore = () => {
  useAppShellStore.getState().reset()
}
