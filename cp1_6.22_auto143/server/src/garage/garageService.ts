import { PartSelection, CarStats, SavedSetup, PartCategory } from '../types';
import { findPart, partsLibrary, getDefaultSelection } from './partsData';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SETUPS_FILE = path.join(DATA_DIR, 'setups.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadSetups(): SavedSetup[] {
  ensureDataDir();
  if (!fs.existsSync(SETUPS_FILE)) {
    return [];
  }
  try {
    const content = fs.readFileSync(SETUPS_FILE, 'utf-8');
    return JSON.parse(content) as SavedSetup[];
  } catch {
    return [];
  }
}

function saveSetups(setups: SavedSetup[]) {
  ensureDataDir();
  fs.writeFileSync(SETUPS_FILE, JSON.stringify(setups, null, 2), 'utf-8');
}

export function calculateStats(selection: PartSelection): CarStats {
  const categories: PartCategory[] = ['engine', 'tire', 'suspension', 'wing'];
  let acceleration = 0;
  let topSpeed = 0;
  let grip = 0;
  let cornering = 0;

  for (const cat of categories) {
    const partId = selection[cat];
    const part = findPart(cat, partId);
    if (part) {
      acceleration += part.stats.acceleration;
      topSpeed += part.stats.topSpeed;
      grip += part.stats.grip;
      cornering += part.stats.cornering;
    }
  }

  const total = acceleration + topSpeed + grip + cornering;
  if (total === 0) {
    return { acceleration: 25, topSpeed: 25, grip: 25, cornering: 25 };
  }

  const scale = 100 / total;
  return {
    acceleration: Math.round(acceleration * scale),
    topSpeed: Math.round(topSpeed * scale),
    grip: Math.round(grip * scale),
    cornering: Math.round(cornering * scale)
  };
}

export function getPartsLibrary() {
  return partsLibrary;
}

export function getCurrentSetup(): { selection: PartSelection; stats: CarStats } {
  const selection = getDefaultSelection();
  const stats = calculateStats(selection);
  return { selection, stats };
}

export function updateSelection(selection: PartSelection): { selection: PartSelection; stats: CarStats } {
  const stats = calculateStats(selection);
  return { selection, stats };
}

export function getAllSetups(): SavedSetup[] {
  return loadSetups();
}

export function saveSetup(name: string, selection: PartSelection): SavedSetup {
  const stats = calculateStats(selection);
  const setup: SavedSetup = {
    id: uuidv4(),
    name,
    selection,
    stats,
    createdAt: Date.now()
  };
  const setups = loadSetups();
  setups.push(setup);
  saveSetups(setups);
  return setup;
}

export function loadSetup(id: string): SavedSetup | null {
  const setups = loadSetups();
  return setups.find(s => s.id === id) || null;
}

export function deleteSetup(id: string): boolean {
  const setups = loadSetups();
  const idx = setups.findIndex(s => s.id === id);
  if (idx === -1) return false;
  setups.splice(idx, 1);
  saveSetups(setups);
  return true;
}
