export type PlaceLookupSourceRecord = {
  naver_place_id: string
  canonical_url: string
  name: string
  road_address: string | null
  land_lot_address: string | null
  latitude: number | null
  longitude: number | null
}

export type PlaceLookupSuccess = {
  status: 'success'
  data: {
    naver_place_id: string
    canonical_url: string
    name: string
    road_address: string | null
    land_lot_address: string | null
    representative_address: string | null
    latitude: number
    longitude: number
    coordinate_source: 'naver' | 'road_address_geocode' | 'land_lot_address_geocode'
  }
}

export type PlaceLookupErrorCode = 'lookup_failed' | 'coordinates_unavailable'

export type PlaceLookupError = {
  status: 'error'
  error: {
    code: PlaceLookupErrorCode
    message: string
  }
}

export type PlaceLookupResult = PlaceLookupSuccess | PlaceLookupError
