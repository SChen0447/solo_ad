export interface TravelMemory {
  id: string;
  name: string;
  lat: number;
  lng: number;
  photo: string;
  note: string;
  rating: number;
  country?: string;
  city?: string;
  createdAt: number;
  visitedAt?: number;
}

export interface MemoryStats {
  totalCount: number;
  countries: string[];
  cities: string[];
  averageRating: number;
}
