export type TransportType = 'walk' | 'bicycle' | 'electric' | 'bus' | 'metro' | 'car' | 'carpool';

export interface CommuteRecord {
  id: string;
  transport: TransportType;
  distance: number;
  emission: number;
  timestamp: number;
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  monthlyEmission: number;
  lastMonthEmission: number;
  weeklyData: number[];
}

export interface EmissionFactors {
  [key: string]: number;
}

export interface TransportOption {
  type: TransportType;
  label: string;
  icon: string;
  color: string;
}

export interface DailyEmission {
  date: string;
  total: number;
  breakdown: {
    [key in TransportType]?: number;
  };
}

export interface MonthlyData {
  total: number;
  target: number;
  breakdown: {
    [key in TransportType]: number;
  };
}
