import { v4 as uuidv4 } from 'uuid';
import type {
  Device,
  Rule,
  LightDevice,
  ACDevice,
  CurtainDevice,
  SensorDevice,
  DeviceType,
  SensorType,
  Comparator,
  ActionType,
  ACMode,
} from './types';

const DEVICES_KEY = 'smart_home_devices';
const RULES_KEY = 'smart_home_rules';

const devicesMap = new Map<string, Device>();
const rulesMap = new Map<string, Rule>();

function createDefaultDevices(): Device[] {
  return [
    {
      id: uuidv4(),
      name: '客厅灯',
      type: 'light',
      x: 10,
      y: 10,
      positionIndex: 0,
      isOn: false,
    } as LightDevice,
    {
      id: uuidv4(),
      name: '卧室空调',
      type: 'ac',
      x: 40,
      y: 10,
      positionIndex: 1,
      isOn: false,
      temperature: 26,
      mode: 'cool' as ACMode,
    } as ACDevice,
    {
      id: uuidv4(),
      name: '厨房烟雾传感器',
      type: 'sensor',
      x: 70,
      y: 10,
      positionIndex: 2,
      sensorType: 'smoke' as SensorType,
      value: 0,
    } as SensorDevice,
    {
      id: uuidv4(),
      name: '阳台窗帘',
      type: 'curtain',
      x: 10,
      y: 40,
      positionIndex: 3,
      openPercent: 50,
    } as CurtainDevice,
    {
      id: uuidv4(),
      name: '书房湿度传感器',
      type: 'sensor',
      x: 40,
      y: 40,
      positionIndex: 4,
      sensorType: 'humidity' as SensorType,
      value: 50,
    } as SensorDevice,
    {
      id: uuidv4(),
      name: '浴室灯',
      type: 'light',
      x: 70,
      y: 40,
      positionIndex: 5,
      isOn: false,
    } as LightDevice,
  ];
}

function loadFromStorage(): void {
  try {
    const savedDevices = localStorage.getItem(DEVICES_KEY);
    const savedRules = localStorage.getItem(RULES_KEY);

    if (savedDevices) {
      const devices: Device[] = JSON.parse(savedDevices);
      devices.forEach((d) => devicesMap.set(d.id, d));
    } else {
      const defaultDevices = createDefaultDevices();
      defaultDevices.forEach((d) => devicesMap.set(d.id, d));
    }

    if (savedRules) {
      const rules: Rule[] = JSON.parse(savedRules);
      rules.forEach((r) => rulesMap.set(r.id, r));
    }
  } catch (e) {
    console.error('Failed to load data from localStorage:', e);
    const defaultDevices = createDefaultDevices();
    defaultDevices.forEach((d) => devicesMap.set(d.id, d));
  }
}

function persistDevices(): void {
  try {
    const devices = Array.from(devicesMap.values());
    localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
  } catch (e) {
    console.error('Failed to save devices to localStorage:', e);
  }
}

function persistRules(): void {
  try {
    const rules = Array.from(rulesMap.values());
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save rules to localStorage:', e);
  }
}

loadFromStorage();

export function getAllDevices(): Device[] {
  return Array.from(devicesMap.values()).sort((a, b) => a.positionIndex - b.positionIndex);
}

export function getDevice(id: string): Device | undefined {
  return devicesMap.get(id);
}

export function addDevice(device: Omit<Device, 'id' | 'positionIndex'>): Device {
  const id = uuidv4();
  const maxIndex = Array.from(devicesMap.values()).reduce(
    (max, d) => Math.max(max, d.positionIndex),
    -1
  );
  const newDevice = { ...device, id, positionIndex: maxIndex + 1 } as Device;
  devicesMap.set(id, newDevice);
  persistDevices();
  return newDevice;
}

export function updateDevice(id: string, updates: Partial<Device>): Device | undefined {
  const device = devicesMap.get(id);
  if (!device) return undefined;
  const updated = { ...device, ...updates } as Device;
  devicesMap.set(id, updated);
  persistDevices();
  return updated;
}

export function deleteDevice(id: string): boolean {
  const deleted = devicesMap.delete(id);
  if (deleted) {
    persistDevices();
    const rulesToDelete: string[] = [];
    rulesMap.forEach((rule) => {
      if (rule.triggerDeviceId === id || rule.targetDeviceId === id) {
        rulesToDelete.push(rule.id);
      }
    });
    rulesToDelete.forEach((rid) => rulesMap.delete(rid));
    if (rulesToDelete.length > 0) persistRules();
  }
  return deleted;
}

export function reorderDevices(fromIndex: number, toIndex: number): void {
  const devices = getAllDevices();
  if (fromIndex < 0 || fromIndex >= devices.length || toIndex < 0 || toIndex >= devices.length) {
    return;
  }
  const [moved] = devices.splice(fromIndex, 1);
  devices.splice(toIndex, 0, moved);
  devices.forEach((d, i) => {
    d.positionIndex = i;
    devicesMap.set(d.id, d);
  });
  persistDevices();
}

export function getAllRules(): Rule[] {
  return Array.from(rulesMap.values());
}

export function getRule(id: string): Rule | undefined {
  return rulesMap.get(id);
}

export function addRule(rule: Omit<Rule, 'id'>): Rule {
  const id = uuidv4();
  const newRule = { ...rule, id };
  rulesMap.set(id, newRule);
  persistRules();
  return newRule;
}

export function updateRule(id: string, updates: Partial<Rule>): Rule | undefined {
  const rule = rulesMap.get(id);
  if (!rule) return undefined;
  const updated = { ...rule, ...updates };
  rulesMap.set(id, updated);
  persistRules();
  return updated;
}

export function deleteRule(id: string): boolean {
  const deleted = rulesMap.delete(id);
  if (deleted) persistRules();
  return deleted;
}

export function detectRuleConflicts(rules: Rule[]): string[] {
  const conflicts: string[] = [];
  const targetGroups = new Map<string, Rule[]>();

  rules.forEach((rule) => {
    if (!targetGroups.has(rule.targetDeviceId)) {
      targetGroups.set(rule.targetDeviceId, []);
    }
    targetGroups.get(rule.targetDeviceId)!.push(rule);
  });

  targetGroups.forEach((targetRules, targetId) => {
    if (targetRules.length < 2) return;

    for (let i = 0; i < targetRules.length; i++) {
      for (let j = i + 1; j < targetRules.length; j++) {
        const r1 = targetRules[i];
        const r2 = targetRules[j];

        if (r1.triggerDeviceId !== r2.triggerDeviceId) continue;
        if (r1.action === r2.action) continue;

        const hasConflict = checkConditionOverlap(r1, r2);
        if (hasConflict) {
          const device = devicesMap.get(targetId);
          const deviceName = device ? device.name : targetId;
          if (!conflicts.includes(deviceName)) {
            conflicts.push(deviceName);
          }
        }
      }
    }
  });

  return conflicts;
}

function checkConditionOverlap(r1: Rule, r2: Rule): boolean {
  if (r1.comparator === '>' && r2.comparator === '<') {
    return r1.threshold < r2.threshold;
  }
  if (r1.comparator === '<' && r2.comparator === '>') {
    return r2.threshold < r1.threshold;
  }
  if (r1.comparator === '>' && r2.comparator === '>') {
    return true;
  }
  if (r1.comparator === '<' && r2.comparator === '<') {
    return true;
  }
  if (r1.comparator === '==' || r2.comparator === '==') {
    return r1.threshold === r2.threshold;
  }
  return false;
}

export function evaluateCondition(
  value: number,
  comparator: Comparator,
  threshold: number
): boolean {
  switch (comparator) {
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    case '==':
      return value === threshold;
    default:
      return false;
  }
}

export function createDevice(
  type: DeviceType,
  name: string,
  sensorType?: SensorType
): Omit<Device, 'id' | 'positionIndex'> {
  const x = Math.floor(Math.random() * 80) + 5;
  const y = Math.floor(Math.random() * 80) + 5;

  const base = { name, type, x, y };

  switch (type) {
    case 'light':
      return { ...base, isOn: false } as Omit<LightDevice, 'id' | 'positionIndex'>;
    case 'ac':
      return {
        ...base,
        isOn: false,
        temperature: 26,
        mode: 'cool' as ACMode,
      } as Omit<ACDevice, 'id' | 'positionIndex'>;
    case 'curtain':
      return { ...base, openPercent: 50 } as Omit<CurtainDevice, 'id' | 'positionIndex'>;
    case 'sensor':
      return {
        ...base,
        sensorType: sensorType || 'temperature',
        value: 0,
      } as Omit<SensorDevice, 'id' | 'positionIndex'>;
  }
}

export function generateRandomSensorValues(): void {
  devicesMap.forEach((device) => {
    if (device.type === 'sensor') {
      let min = 0;
      let max = 100;
      switch (device.sensorType) {
        case 'temperature':
          min = 20;
          max = 40;
          break;
        case 'humidity':
          min = 20;
          max = 80;
          break;
        case 'smoke':
          min = 0;
          max = 50;
          break;
        case 'light':
          min = 0;
          max = 100;
          break;
      }
      device.value = Math.floor(Math.random() * (max - min + 1)) + min;
      devicesMap.set(device.id, device);
    }
  });
  persistDevices();
}

export function executeRuleAction(rule: Rule): { deviceName: string; action: string } | null {
  const targetDevice = devicesMap.get(rule.targetDeviceId);
  if (!targetDevice) return null;

  let actionDesc = '';

  switch (targetDevice.type) {
    case 'light':
      if (rule.action === 'on') {
        (targetDevice as LightDevice).isOn = true;
        actionDesc = '开启';
      } else if (rule.action === 'off') {
        (targetDevice as LightDevice).isOn = false;
        actionDesc = '关闭';
      }
      break;
    case 'ac':
      if (rule.action === 'on') {
        (targetDevice as ACDevice).isOn = true;
        actionDesc = '开启';
      } else if (rule.action === 'off') {
        (targetDevice as ACDevice).isOn = false;
        actionDesc = '关闭';
      } else if (rule.action === 'set_value' && rule.actionValue !== undefined) {
        (targetDevice as ACDevice).temperature = Math.max(22, Math.min(30, rule.actionValue));
        actionDesc = `设置温度为${(targetDevice as ACDevice).temperature}度`;
      }
      break;
    case 'curtain':
      if (rule.action === 'set_value' && rule.actionValue !== undefined) {
        (targetDevice as CurtainDevice).openPercent = Math.max(0, Math.min(100, rule.actionValue));
        actionDesc = `开合度设为${(targetDevice as CurtainDevice).openPercent}%`;
      } else if (rule.action === 'on') {
        (targetDevice as CurtainDevice).openPercent = 100;
        actionDesc = '完全打开';
      } else if (rule.action === 'off') {
        (targetDevice as CurtainDevice).openPercent = 0;
        actionDesc = '完全关闭';
      }
      break;
    default:
      return null;
  }

  devicesMap.set(targetDevice.id, targetDevice);
  persistDevices();
  return { deviceName: targetDevice.name, action: actionDesc };
}

export function getSensorValueLabel(sensorType: SensorType): string {
  switch (sensorType) {
    case 'temperature':
      return '°C';
    case 'humidity':
      return '%';
    case 'smoke':
      return 'ppm';
    case 'light':
      return 'lux';
  }
}

export function getDeviceTypeLabel(type: DeviceType): string {
  switch (type) {
    case 'light':
      return '灯';
    case 'ac':
      return '空调';
    case 'curtain':
      return '窗帘';
    case 'sensor':
      return '传感器';
  }
}

export function getActionLabel(action: ActionType): string {
  switch (action) {
    case 'on':
      return '开启';
    case 'off':
      return '关闭';
    case 'set_value':
      return '设置数值';
  }
}
