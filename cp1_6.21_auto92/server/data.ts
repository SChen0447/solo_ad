export interface Stall {
  id: string;
  label: string;
  status: 'available' | 'occupied' | 'checked-in' | 'blocked';
  vendorName?: string;
  vendorPhone?: string;
  vendorCategory?: string;
  checkInTime?: string;
}

export interface Fair {
  id: string;
  name: string;
  date: string;
  totalStalls: number;
  price: number;
  stalls: Stall[];
  createdAt: string;
}

export interface AppData {
  fairs: Fair[];
}

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'data.json');

function generateStalls(count: number): Stall[] {
  const stalls: Stall[] = [];
  const cols = 6;
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols) + 1;
    const col = i % cols + 1;
    const rowLetter = String.fromCharCode(64 + row);
    stalls.push({
      id: uuidv4(),
      label: `${rowLetter}${col}`,
      status: 'available',
    });
  }
  return stalls;
}

function getDefaultData(): AppData {
  return {
    fairs: [
      {
        id: uuidv4(),
        name: '春日手作市集',
        date: '2026-04-15',
        totalStalls: 30,
        price: 150,
        stalls: generateStalls(30),
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        name: '复古跳蚤市场',
        date: '2026-05-20',
        totalStalls: 24,
        price: 120,
        stalls: generateStalls(24),
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        name: '夏日创意集市',
        date: '2026-07-10',
        totalStalls: 36,
        price: 180,
        stalls: generateStalls(36),
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function readData(): AppData {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      const defaultData = getDefaultData();
      fs.writeFileSync(DATA_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw) as AppData;
  } catch {
    const defaultData = getDefaultData();
    fs.writeFileSync(DATA_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
}

export function writeData(data: AppData): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export { generateStalls };
