export type DeviceType = 'light' | 'ac' | 'curtain' | 'sensor';

export type SensorType = 'temperature' | 'humidity' | 'smoke' | 'light';

export type ACMode = 'cool' | 'heat' | 'fan';

export type Comparator = '>' | '<' | '==';

export type ActionType = 'on' | 'off' | 'set_value';

export interface DeviceBase {
  id: string;
  name: string;
  type: DeviceType;
  x: number;
  y: number;
  positionIndex: number;
}

export interface LightDevice extends DeviceBase {
  type: 'light';
  isOn: boolean;
}

export interface ACDevice extends DeviceBase {
  type: 'ac';
  isOn: boolean;
  temperature: number;
  mode: ACMode;
}

export interface CurtainDevice extends DeviceBase {
  type: 'curtain';
  openPercent: number;
}

export interface SensorDevice extends DeviceBase {
  type: 'sensor';
  sensorType: SensorType;
  value: number;
}

export type Device = LightDevice | ACDevice | CurtainDevice | SensorDevice;

export interface Rule {
  id: string;
  triggerDeviceId: string;
  comparator: Comparator;
  threshold: number;
  targetDeviceId: string;
  action: ActionType;
  actionValue?: number;
}

export interface Room {
  id: string;
  name: string;
  devices: Device[];
  rules: Rule[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  deviceName: string;
  action: string;
  reason: string;
}
