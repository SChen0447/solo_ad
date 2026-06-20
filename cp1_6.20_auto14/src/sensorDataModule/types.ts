export type SensorType = 'temperature' | 'humidity' | 'pressure';

export interface SensorData {
  id: string;
  timestamp: number;
  time: string;
  temperature: number;
  humidity: number;
  pressure: number;
}

export interface AlertRule {
  id: string;
  sensorType: SensorType;
  operator: '>' | '<';
  threshold: number;
  enabled: boolean;
}

export interface AlertNotification {
  id: string;
  timestamp: number;
  time: string;
  sensorType: SensorType;
  value: number;
  ruleDescription: string;
}

export interface SensorState {
  sensorData: SensorData[];
  alertRules: AlertRule[];
  alertNotifications: AlertNotification[];
}

type Action =
  | { type: 'ADD_SENSOR_DATA'; payload: SensorData }
  | { type: 'ADD_ALERT_RULE'; payload: AlertRule }
  | { type: 'UPDATE_ALERT_RULE'; payload: AlertRule }
  | { type: 'DELETE_ALERT_RULE'; payload: string }
  | { type: 'ADD_ALERT_NOTIFICATION'; payload: AlertNotification }
  | { type: 'REMOVE_ALERT_NOTIFICATION'; payload: string };

const MAX_DATA_POINTS = 200;

export const sensorInitialState: SensorState = {
  sensorData: [],
  alertRules: [],
  alertNotifications: [],
};

export function sensorReducer(state: SensorState, action: Action): SensorState {
  switch (action.type) {
    case 'ADD_SENSOR_DATA': {
      const newData = [...state.sensorData, action.payload];
      if (newData.length > MAX_DATA_POINTS) {
        newData.shift();
      }
      return { ...state, sensorData: newData };
    }
    case 'ADD_ALERT_RULE':
      return { ...state, alertRules: [...state.alertRules, action.payload] };
    case 'UPDATE_ALERT_RULE':
      return {
        ...state,
        alertRules: state.alertRules.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'DELETE_ALERT_RULE':
      return {
        ...state,
        alertRules: state.alertRules.filter((r) => r.id !== action.payload),
      };
    case 'ADD_ALERT_NOTIFICATION':
      return {
        ...state,
        alertNotifications: [action.payload, ...state.alertNotifications],
      };
    case 'REMOVE_ALERT_NOTIFICATION':
      return {
        ...state,
        alertNotifications: state.alertNotifications.filter(
          (n) => n.id !== action.payload
        ),
      };
    default:
      return state;
  }
}

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export const SENSOR_LABELS: Record<SensorType, string> = {
  temperature: '温度',
  humidity: '湿度',
  pressure: '气压',
};

export const SENSOR_UNITS: Record<SensorType, string> = {
  temperature: '°C',
  humidity: '%',
  pressure: 'hPa',
};

export const SENSOR_COLORS: Record<SensorType, string> = {
  temperature: '#e94560',
  humidity: '#4ade80',
  pressure: '#a78bfa',
};
