export interface User {
  id: string;
  username: string;
}

export interface TravelLocation {
  id: string;
  userId: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  arrivalDate: string;
  daysStayed: number;
  flagColor: string;
}

export interface Photo {
  url: string;
  title: string;
  filename?: string;
}

export interface Journal {
  id: string;
  locationId: string;
  userId: string;
  title: string;
  content: string;
  weather: string;
  mood: string;
  photos: Photo[];
  createdAt: string;
}

export interface LocationWithJournal extends TravelLocation {
  journal?: Journal;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {}

export interface CreateLocationPayload {
  userId: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  arrivalDate: string;
  daysStayed: number;
  flagColor: string;
}

export interface CreateJournalPayload {
  locationId: string;
  userId: string;
  title: string;
  content: string;
  weather: string;
  mood: string;
  photos: Photo[];
}

export const WEATHER_OPTIONS = ['☀️ 晴', '⛅ 多云', '🌧️ 雨', '❄️ 雪', '🌫️ 雾', '🌪️ 风'];

export const MOOD_OPTIONS = ['😊', '🥰', '😎', '🤩', '😌', '🥹', '🤔', '😴'];

export const COUNTRY_FLAGS: Record<string, string> = {
  '中国': '#DE2910',
  '日本': '#BC002D',
  '韩国': '#003478',
  '美国': '#3C3B6E',
  '英国': '#012169',
  '法国': '#0055A4',
  '德国': '#000000',
  '意大利': '#008C45',
  '西班牙': '#AA151B',
  '泰国': '#A51931',
  '新加坡': '#ED2939',
  '澳大利亚': '#012169',
  '加拿大': '#FF0000',
  '俄罗斯': '#0039A6',
  '巴西': '#009C3B',
  '印度': '#FF9933',
  '越南': '#DA251D',
  '马来西亚': '#010066',
  '印度尼西亚': '#FF0000',
  '菲律宾': '#0038A8',
};
