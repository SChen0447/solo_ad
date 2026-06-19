import { v4 as uuidv4 } from 'uuid';
import type { CommuteRecord, Friend, EmissionFactors, TransportType } from './types';

const EMISSION_FACTORS: EmissionFactors = {
  walk: 0,
  bicycle: 0,
  electric: 5,
  bus: 50,
  metro: 30,
  car: 120,
  carpool: 60,
};

const FRIENDS_DATA: Friend[] = [
  {
    id: '1',
    name: '张小明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    monthlyEmission: 45.2,
    lastMonthEmission: 52.8,
    weeklyData: [8.2, 6.5, 7.1, 5.8, 9.3, 4.2, 4.1],
  },
  {
    id: '2',
    name: '李华',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily',
    monthlyEmission: 78.6,
    lastMonthEmission: 72.3,
    weeklyData: [12.4, 11.2, 10.8, 13.5, 11.1, 9.8, 9.8],
  },
  {
    id: '3',
    name: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wendy',
    monthlyEmission: 32.4,
    lastMonthEmission: 45.6,
    weeklyData: [5.2, 4.8, 3.9, 5.1, 6.2, 3.5, 3.7],
  },
  {
    id: '4',
    name: '赵强',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    monthlyEmission: 156.8,
    lastMonthEmission: 189.2,
    weeklyData: [22.5, 24.1, 21.8, 25.3, 22.0, 21.2, 19.9],
  },
  {
    id: '5',
    name: '陈雪',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Snow',
    monthlyEmission: 89.3,
    lastMonthEmission: 78.5,
    weeklyData: [14.2, 12.8, 13.5, 11.9, 12.4, 12.2, 12.3],
  },
];

const generateMockRecords = (): CommuteRecord[] => {
  const records: CommuteRecord[] = [];
  const transportTypes: TransportType[] = ['walk', 'bicycle', 'electric', 'bus', 'metro', 'car', 'carpool'];
  const now = Date.now();

  for (let day = 6; day >= 0; day--) {
    const recordsPerDay = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < recordsPerDay; i++) {
      const transport = transportTypes[Math.floor(Math.random() * transportTypes.length)];
      const distance = Math.round((Math.random() * 15 + 1) * 10) / 10;
      const emission = calculateEmission(transport, distance);
      records.push({
        id: uuidv4(),
        transport,
        distance,
        emission,
        timestamp: now - day * 24 * 60 * 60 * 1000 - i * 60 * 60 * 1000,
      });
    }
  }

  const historicalDays = 23;
  for (let day = historicalDays; day >= 7; day--) {
    const transport = transportTypes[Math.floor(Math.random() * transportTypes.length)];
    const distance = Math.round((Math.random() * 10 + 2) * 10) / 10;
    const emission = calculateEmission(transport, distance);
    records.push({
      id: uuidv4(),
      transport,
      distance,
      emission,
      timestamp: now - day * 24 * 60 * 60 * 1000,
    });
  }

  return records.sort((a, b) => b.timestamp - a.timestamp);
};

let recordsCache: CommuteRecord[] | null = null;

export function calculateEmission(transport: TransportType, distance: number): number {
  const factor = EMISSION_FACTORS[transport] || 0;
  return Math.round(factor * distance * 100) / 100;
}

export function getEmissionFactors(): EmissionFactors {
  return { ...EMISSION_FACTORS };
}

export async function getRecords(): Promise<CommuteRecord[]> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (!recordsCache) {
    recordsCache = generateMockRecords();
  }
  return [...recordsCache];
}

export async function addRecord(
  record: Omit<CommuteRecord, 'id' | 'timestamp'>
): Promise<CommuteRecord> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const newRecord: CommuteRecord = {
    ...record,
    id: uuidv4(),
    timestamp: Date.now(),
  };
  if (recordsCache) {
    recordsCache.unshift(newRecord);
  }
  return newRecord;
}

export async function getFriends(): Promise<Friend[]> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return [...FRIENDS_DATA].sort((a, b) => a.monthlyEmission - b.monthlyEmission);
}

export const TRANSPORT_LABELS: { [key in TransportType]: string } = {
  walk: '步行',
  bicycle: '自行车',
  electric: '电动车',
  bus: '公交车',
  metro: '地铁',
  car: '私家车',
  carpool: '拼车',
};

export const TRANSPORT_ICONS: { [key in TransportType]: string } = {
  walk: '🚶',
  bicycle: '🚲',
  electric: '🛵',
  bus: '🚌',
  metro: '🚇',
  car: '🚗',
  carpool: '🚐',
};

export const TRANSPORT_COLORS: { [key in TransportType]: string } = {
  walk: '#81C784',
  bicycle: '#66BB6A',
  electric: '#FFB74D',
  bus: '#4FC3F7',
  metro: '#7E57C2',
  car: '#EF5350',
  carpool: '#AB47BC',
};
