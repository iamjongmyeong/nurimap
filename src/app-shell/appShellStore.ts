import { create } from 'zustand'
import {
  createInitialPlaces,
  submitReviewForPlace,
  type PlaceRegistrationResult,
  type ReviewDraft,
  type ReviewSubmissionResult,
} from './placeRepository'
import { DEFAULT_SELECTED_PLACE_ID } from './mockPlaces'
import type { PlaceSummary } from './types'

export type NavigationState =
  | 'map_browse'
  | 'mobile_place_list_open'
  | 'place_add_open'
  | 'place_detail_open'

export type DetailChildSurface = 'detail' | 'add_rating'
export type PlaceListLoadState = 'idle' | 'loading' | 'empty' | 'ready' | 'error'
export type PlaceDetailLoadState = 'idle' | 'loading' | 'ready' | 'error'

type AppShellState = {
  navigationState: NavigationState
  detailChildSurface: DetailChildSurface
  placeListLoad: PlaceListLoadState
  placeDetailLoad: PlaceDetailLoadState
  selectedPlaceId: string | null
  mapLevel: number
  places: PlaceSummary[]
  openMobilePlaceList: () => void
  openPlaceAdd: () => void
  closePlaceAdd: () => void
  openPlaceDetail: (placeId: string) => void
  closePlaceDetail: () => void
  openDetailAddRating: () => void
  closeDetailAddRating: () => void
  syncDetailChildSurface: (surface: DetailChildSurface) => void
  returnToMapBrowse: () => void
  setSelectedPlaceId: (placeId: string | null) => void
  setPlaceListLoad: (status: PlaceListLoadState) => void
  setPlaceDetailLoad: (status: PlaceDetailLoadState) => void
  setMapLevel: (level: number) => void
  setPlaces: (places: PlaceSummary[]) => void
  applyRegistrationResult: (result: PlaceRegistrationResult) => void
  submitPlaceReview: (placeId: string, draft: ReviewDraft) => ReviewSubmissionResult
  retryPlaceList: () => void
  retryPlaceDetail: () => void
  reset: () => void
}

const buildInitialState = () => ({
  navigationState: 'map_browse' as NavigationState,
  detailChildSurface: 'detail' as DetailChildSurface,
  placeListLoad: 'ready' as PlaceListLoadState,
  placeDetailLoad: 'ready' as PlaceDetailLoadState,
  selectedPlaceId: DEFAULT_SELECTED_PLACE_ID,
  mapLevel: 3,
  places: createInitialPlaces(),
})

export const useAppShellStore = create<AppShellState>((set, get) => ({
  ...buildInitialState(),
  openMobilePlaceList: () => set({ navigationState: 'mobile_place_list_open', detailChildSurface: 'detail' }),
  openPlaceAdd: () => set({ navigationState: 'place_add_open', detailChildSurface: 'detail' }),
  closePlaceAdd: () => set({ navigationState: 'map_browse', detailChildSurface: 'detail' }),
  openPlaceDetail: (placeId) =>
    set({
      navigationState: 'place_detail_open',
      detailChildSurface: 'detail',
      placeDetailLoad: 'ready',
      selectedPlaceId: placeId,
    }),
  closePlaceDetail: () => set({ navigationState: 'map_browse', detailChildSurface: 'detail' }),
  openDetailAddRating: () => set({ detailChildSurface: 'add_rating' }),
  closeDetailAddRating: () => set({ detailChildSurface: 'detail' }),
  syncDetailChildSurface: (detailChildSurface) => set({ detailChildSurface }),
  returnToMapBrowse: () => set({ navigationState: 'map_browse', detailChildSurface: 'detail' }),
  setSelectedPlaceId: (selectedPlaceId) => set({ selectedPlaceId }),
  setPlaceListLoad: (placeListLoad) => set({ placeListLoad }),
  setPlaceDetailLoad: (placeDetailLoad) => set({ placeDetailLoad }),
  setMapLevel: (mapLevel) => set({ mapLevel }),
  setPlaces: (places) => set({ places }),
  applyRegistrationResult: (result) =>
    set({
      places: result.places,
      selectedPlaceId: result.place.id,
      navigationState: 'map_browse',
      detailChildSurface: 'detail',
      placeDetailLoad: 'ready',
    }),
  submitPlaceReview: (placeId, draft) => {
    const result = submitReviewForPlace({
      placeId,
      draft,
      places: get().places,
    })

    if (result.status === 'saved') {
      set({
        places: result.places,
        selectedPlaceId: result.place.id,
        navigationState: 'place_detail_open',
        detailChildSurface: 'detail',
        placeDetailLoad: 'ready',
      })
    }

    return result
  },
  retryPlaceList: () => set({ placeListLoad: 'ready' }),
  retryPlaceDetail: () => set({ placeDetailLoad: 'ready' }),
  reset: () => set(buildInitialState()),
}))

export const resetAppShellStore = () => {
  useAppShellStore.getState().reset()
}
