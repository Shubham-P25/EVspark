export type StationStatus = 'available' | 'busy' | 'offline'

export type Station = {
  id: number
  name: string
  address: string
  lat: number
  lng: number
  status: StationStatus
  distance: string
  eta: string
  power: string
  connector: string
  price: number
  available: number
  total: number
  rating: number
  amenities: string[]
  operator: string
}

export const stations: Station[] = [
  { id: 1, name: 'EVspark Bandra West', address: 'Linking Road, Bandra West', lat: 19.0607, lng: 72.8362, status: 'available', distance: '1.2 km', eta: '5 min', power: '120 kW', connector: 'CCS2', price: 18, available: 3, total: 4, rating: 4.8, amenities: ['Coffee Shop', 'WiFi', 'Restroom'], operator: 'EVspark Network' },
  { id: 2, name: 'EVspark Andheri East', address: 'MIDC Road, Andheri East', lat: 19.1197, lng: 72.8468, status: 'busy', distance: '4.8 km', eta: '14 min', power: '180 kW', connector: 'CCS2', price: 20, available: 0, total: 6, rating: 4.6, amenities: ['Cafe', 'Covered Parking'], operator: 'EVspark Network' },
  { id: 3, name: 'EVspark Powai', address: 'Hiranandani Gardens, Powai', lat: 19.1176, lng: 72.906, status: 'available', distance: '6.4 km', eta: '18 min', power: '60 kW', connector: 'Type 2', price: 15, available: 4, total: 4, rating: 4.7, amenities: ['Mall Access', 'Restroom'], operator: 'EVspark Network' },
  { id: 4, name: 'EVspark Worli', address: 'Dr Annie Besant Road, Worli', lat: 19.0178, lng: 72.8173, status: 'available', distance: '7.1 km', eta: '21 min', power: '150 kW', connector: 'CCS2', price: 22, available: 2, total: 4, rating: 4.9, amenities: ['Valet', 'Lounge', 'WiFi'], operator: 'EVspark Network' },
  { id: 5, name: 'EVspark Lower Parel', address: 'Senapati Bapat Marg, Lower Parel', lat: 18.9988, lng: 72.8258, status: 'busy', distance: '8.3 km', eta: '24 min', power: '90 kW', connector: 'CCS2', price: 19, available: 1, total: 3, rating: 4.5, amenities: ['Food Court'], operator: 'EVspark Network' },
  { id: 6, name: 'EVspark Navi Mumbai', address: 'Palm Beach Road, Vashi', lat: 19.0771, lng: 73.0028, status: 'available', distance: '22.5 km', eta: '38 min', power: '240 kW', connector: 'CCS2', price: 17, available: 6, total: 8, rating: 4.8, amenities: ['Lounge', 'Cafe', 'Restroom'], operator: 'EVspark Network' },
  { id: 7, name: 'EVspark Juhu', address: 'Juhu Tara Road, Juhu', lat: 19.0883, lng: 72.8268, status: 'offline', distance: '3.9 km', eta: '12 min', power: '60 kW', connector: 'Type 2', price: 16, available: 0, total: 2, rating: 4.3, amenities: ['Beach Access'], operator: 'EVspark Network' },
  { id: 8, name: 'EVspark Ghatkopar', address: 'Eastern Express Highway', lat: 19.086, lng: 72.9081, status: 'available', distance: '9.6 km', eta: '26 min', power: '120 kW', connector: 'CCS2', price: 18, available: 2, total: 4, rating: 4.6, amenities: ['Restroom', 'Food Court'], operator: 'EVspark Network' },
  { id: 9, name: 'EVspark Malad', address: 'Link Road, Malad West', lat: 19.186, lng: 72.8489, status: 'busy', distance: '11.4 km', eta: '30 min', power: '150 kW', connector: 'CCS2', price: 21, available: 1, total: 5, rating: 4.4, amenities: ['Mall Access'], operator: 'EVspark Network' },
  { id: 10, name: 'EVspark Thane', address: 'Ghodbunder Road, Thane', lat: 19.2183, lng: 72.9781, status: 'available', distance: '18.2 km', eta: '34 min', power: '180 kW', connector: 'CCS2', price: 18, available: 5, total: 6, rating: 4.8, amenities: ['Cafe', 'WiFi', 'Restroom'], operator: 'EVspark Network' },
  { id: 11, name: 'EVspark BKC', address: 'Bandra Kurla Complex', lat: 19.0687, lng: 72.8703, status: 'available', distance: '2.8 km', eta: '9 min', power: '240 kW', connector: 'CCS2', price: 24, available: 1, total: 4, rating: 4.9, amenities: ['Lounge', 'Valet'], operator: 'EVspark Network' },
  { id: 12, name: 'EVspark Chembur', address: 'Sion Panvel Highway, Chembur', lat: 19.0522, lng: 72.9005, status: 'available', distance: '10.7 km', eta: '28 min', power: '90 kW', connector: 'CCS2', price: 16, available: 2, total: 3, rating: 4.5, amenities: ['Restroom'], operator: 'EVspark Network' },
]
