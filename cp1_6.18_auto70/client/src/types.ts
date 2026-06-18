export type POICategory = 'nature' | 'culture' | 'food';

export type ActivityType = 'poi' | 'food' | 'transport';

export interface Activity {
  id: string;
  name: string;
  type: ActivityType;
  startTime: string;
  endTime: string;
  duration: number;
  category?: POICategory;
  notes?: string;
}

export interface TripDay {
  date: string;
  activities: Activity[];
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  city: string;
  categories: POICategory[];
  days: TripDay[];
}

export interface Conflict {
  id: string;
  activityIds: [string, string];
  type: 'overlap' | 'tight_gap';
  message: string;
  suggestion: string;
}

export interface POI {
  id: string;
  name: string;
  city: string;
  category: POICategory;
  duration: number;
  description: string;
  suggestedTime: string;
}

export type ConflictStatus = 'ok' | 'warning' | 'danger';
