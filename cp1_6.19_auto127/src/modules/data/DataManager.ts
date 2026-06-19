export interface TravelImage {
  id: string
  title: string
  dataUrl: string
}

export interface Landmark {
  id: string
  cityName: string
  lat: number
  lng: number
  arrivalDate: string
  stayDays: number
  images: TravelImage[]
  notes: string
}

const STORAGE_KEY = 'memorymap_landmarks'

export class DataManager {
  loadLandmarks(): Landmark[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as Landmark[]
      return []
    } catch {
      return []
    }
  }

  saveLandmarks(landmarks: Landmark[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(landmarks))
    } catch {
      console.warn('Failed to save landmarks to localStorage')
    }
  }

  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  filterByYearRange(
    landmarks: Landmark[],
    startYear: number,
    endYear: number
  ): Landmark[] {
    return landmarks.filter(l => {
      const year = new Date(l.arrivalDate).getFullYear()
      return year >= startYear && year <= endYear
    })
  }

  sortByDate(landmarks: Landmark[]): Landmark[] {
    return [...landmarks].sort((a, b) =>
      new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime()
    )
  }
}
