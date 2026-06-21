export interface WeatherEvent {
  description: string;
  type: string;
  value: number;
}

export interface MonthlyRecord {
  month: number;
  temperature: number;
  precipitation: number;
  sunshine: number;
  windSpeed: number;
  event?: WeatherEvent;
}

export interface CityData {
  id: string;
  name: string;
  abbr: string;
  index: number;
  records: MonthlyRecord[];
}

export type CompareMode = 'curve' | 'bar';

export type WeatherField = 'temperature' | 'precipitation' | 'sunshine' | 'windSpeed';

export interface DetailCardInfo {
  cityId: string;
  cityName: string;
  month: number;
  value: number;
  change: number;
  changePercent: number;
  event?: WeatherEvent;
  position: [number, number, number];
}

export const WEATHER_FIELD_CONFIG: Record<WeatherField, { label: string; unit: string; colorTheme: string }> = {
  temperature: { label: '月均温度', unit: '℃', colorTheme: '#ef4444' },
  precipitation: { label: '降水量', unit: 'mm', colorTheme: '#3b82f6' },
  sunshine: { label: '日照时长', unit: 'h', colorTheme: '#eab308' },
  windSpeed: { label: '风速', unit: 'm/s', colorTheme: '#06b6d4' },
};

export const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export const CITY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];
