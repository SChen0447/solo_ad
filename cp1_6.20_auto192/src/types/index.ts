export interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Attraction {
  id: string;
  cityId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  duration: string;
  transport: string;
}

export interface DayAttraction {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  duration: string;
  transport: string;
  note: string;
}

export interface DayPlan {
  dayIndex: number;
  attractions: DayAttraction[];
}

export interface Itinerary {
  id: string;
  cityName: string;
  tripName: string;
  days: DayPlan[];
  createdAt: string;
  thumbnail: string;
}

export interface ItinerarySummary {
  id: string;
  cityName: string;
  tripName: string;
  days: number;
  createdAt: string;
  thumbnail: string;
}

export interface ShareLink {
  link: string;
  expiresAt: string;
}

export interface SaveItineraryRequest {
  cityName: string;
  tripName: string;
  days: DayPlan[];
  thumbnail: string;
}
