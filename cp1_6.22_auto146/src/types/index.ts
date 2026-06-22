export type DeviceType = 'light' | 'ac' | 'curtain' | 'temp_sensor' | 'humidity_sensor' | 'motion_sensor';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  online: boolean;
  status: 'on' | 'off' | 'open' | 'closed';
  value: number;
}

export type NodeType = 'condition' | 'action';

export type ConditionSubtype = 'temp_high' | 'temp_low' | 'humidity_high' | 'humidity_low' | 'device_on' | 'motion';

export type ActionSubtype = 'light_on' | 'light_off' | 'ac_on' | 'ac_off' | 'curtain_open' | 'curtain_close';

export interface RuleNode {
  id: string;
  type: NodeType;
  subtype: ConditionSubtype | ActionSubtype;
  label: string;
  x: number;
  y: number;
  params: Record<string, any>;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface Scene {
  id: string;
  name: string;
  nodes: RuleNode[];
  connections: Connection[];
}

export interface DeviceChange {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  oldStatus: string;
  newStatus: string;
  oldValue: number;
  newValue: number;
  message: string;
}

export interface SceneExecutionResult {
  changes: DeviceChange[];
  conditionsMet: boolean;
}

export interface WSMessage {
  type: 'initial' | 'device_update' | 'device_add' | 'device_delete';
  devices?: Device[];
  device?: Device;
  deviceId?: string;
}
