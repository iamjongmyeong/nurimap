export type PlaceType = 'restaurant' | 'cafe'
export type ZeropayStatus = 'available' | 'unavailable' | 'needs_verification'

export type PlaceSummary = {
  id: string
  naver_place_id: string
  naver_place_url: string
  name: string
  road_address: string
  latitude?: number
  longitude?: number
  place_type: PlaceType
  zeropay_status: ZeropayStatus
  average_rating: number
  review_count: number
}
