export type EventType = 'protest' | 'festival' | 'disaster' | 'economy' | 'traffic';

export interface CityEvent {
  id: string;
  cityName: string;
  latitude: number;
  longitude: number;
  population: number;
  eventType: EventType;
  eventCount: number;
  eventName: string;
  timestamp: string;
}

export type ColorMap = Record<EventType, string>;

export interface Annotation {
  id: string;
  text: string;
  cityEventId: string;
  position: { x: number; y: number; z: number };
}

export interface HoveredBubbleInfo {
  event: CityEvent;
  screenPosition: { x: number; y: number };
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  protest: '抗议示威',
  festival: '节庆活动',
  disaster: '灾害事件',
  economy: '经济动态',
  traffic: '交通事件'
};

export const DEFAULT_COLORS: ColorMap = {
  protest: '#ff6b6b',
  festival: '#48cae4',
  disaster: '#f9ca24',
  economy: '#6c5ce7',
  traffic: '#00b894'
};
