export interface Trip {
  id: string;
  name: string;
  days: DayPlan[];
  createdAt: string;
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  date: string;
  spots: Spot[];
}

export interface Spot {
  id: string;
  name: string;
  duration: number;
  lat: number;
  lng: number;
  order: number;
}

export interface DiaryEntry {
  id: string;
  tripId: string;
  spotId: string;
  spotName: string;
  content: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface Photo {
  id: string;
  url: string;
  date: string;
  diaryId: string;
}

export interface StoredImage {
  id: string;
  data: string;
  mimeType: string;
}
