import type { Database, SqlJsStatic } from 'sql.js';

declare global {
  interface Window {
    initSqlJs: (config?: any) => Promise<SqlJsStatic>;
    SQL: SqlJsStatic;
  }
}

export interface Cat {
  id: number;
  name: string;
  avatar?: string;
  breed: string;
  age: number;
  personality: string[];
  color: string;
  created_at: string;
}

export type ToyType = 'chase' | 'scratch' | 'puzzle';
export type ToyMaterial = 'plastic' | 'cloth' | 'feather' | 'wood' | 'rubber' | 'other';
export type DangerLevel = 'safe' | 'supervise' | 'avoid';
export type CatReaction = 'excited' | 'normal' | 'ignore';

export interface Toy {
  id: number;
  name: string;
  type: ToyType;
  material: ToyMaterial;
  danger_level: DangerLevel;
  image?: string;
  description?: string;
  is_custom: number;
  cat_id: number;
  created_at: string;
}

export interface InteractionRecord {
  id: number;
  toy_id: number;
  cat_id: number;
  duration: number;
  reaction: CatReaction;
  damaged: number;
  created_at: string;
}

export interface DailyStats {
  date: string;
  total_duration: number;
}

const CAT_COLORS = [
  '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA',
  '#FFDFBA', '#E0BBE4', '#957DAD', '#D4A5A5'
];

const PRESET_TOYS: Omit<Toy, 'id' | 'cat_id' | 'created_at' | 'is_custom'>[] = [
  { name: '羽毛棒', type: 'chase', material: 'feather', danger_level: 'safe' },
  { name: '激光笔', type: 'chase', material: 'plastic', danger_level: 'supervise' },
  { name: '逗猫球', type: 'chase', material: 'plastic', danger_level: 'safe' },
  { name: '毛线球', type: 'chase', material: 'cloth', danger_level: 'supervise' },
  { name: '猫爬架', type: 'scratch', material: 'cloth', danger_level: 'safe' },
  { name: '猫抓板', type: 'scratch', material: 'wood', danger_level: 'safe' },
  { name: '剑麻柱', type: 'scratch', material: 'other', danger_level: 'safe' },
  { name: '漏食球', type: 'puzzle', material: 'plastic', danger_level: 'safe' },
  { name: '智能迷宫', type: 'puzzle', material: 'plastic', danger_level: 'safe' },
  { name: ' treat 拼图', type: 'puzzle', material: 'wood', danger_level: 'safe' },
  { name: '猫隧道', type: 'chase', material: 'cloth', danger_level: 'safe' },
  { name: '小老鼠玩具', type: 'chase', material: 'feather', danger_level: 'safe' },
  { name: '弹力球', type: 'chase', material: 'rubber', danger_level: 'safe' },
  { name: '猫薄荷鱼', type: 'chase', material: 'cloth', danger_level: 'safe' },
  { name: '纸袋子', type: 'chase', material: 'other', danger_level: 'supervise' },
  { name: '逗猫棒套装', type: 'chase', material: 'feather', danger_level: 'safe' },
  { name: '铃铛球', type: 'chase', material: 'plastic', danger_level: 'safe' },
  { name: '吸盘玩具', type: 'scratch', material: 'rubber', danger_level: 'safe' },
  { name: '自动逗猫器', type: 'chase', material: 'plastic', danger_level: 'supervise' },
  { name: '猫草玩具', type: 'puzzle', material: 'other', danger_level: 'safe' },
];

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  const SQL = await window.initSqlJs({
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`
  });
  
  db = new SQL.Database();
  
  db.run(`
    CREATE TABLE IF NOT EXISTS cats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar TEXT,
      breed TEXT NOT NULL,
      age INTEGER NOT NULL,
      personality TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS toys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      material TEXT NOT NULL,
      danger_level TEXT NOT NULL,
      image TEXT,
      description TEXT,
      is_custom INTEGER DEFAULT 0,
      cat_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cat_id) REFERENCES cats(id)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      toy_id INTEGER NOT NULL,
      cat_id INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      reaction TEXT NOT NULL,
      damaged INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (toy_id) REFERENCES toys(id),
      FOREIGN KEY (cat_id) REFERENCES cats(id)
    )
  `);
  
  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function rowToCat(row: any[]): Cat {
  return {
    id: row[0] as number,
    name: row[1] as string,
    avatar: row[2] as string | undefined,
    breed: row[3] as string,
    age: row[4] as number,
    personality: JSON.parse(row[5] as string),
    color: row[6] as string,
    created_at: row[7] as string,
  };
}

function rowToToy(row: any[]): Toy {
  return {
    id: row[0] as number,
    name: row[1] as string,
    type: row[2] as ToyType,
    material: row[3] as ToyMaterial,
    danger_level: row[4] as DangerLevel,
    image: row[5] as string | undefined,
    description: row[6] as string | undefined,
    is_custom: row[7] as number,
    cat_id: row[8] as number,
    created_at: row[9] as string,
  };
}

function rowToInteraction(row: any[]): InteractionRecord {
  return {
    id: row[0] as number,
    toy_id: row[1] as number,
    cat_id: row[2] as number,
    duration: row[3] as number,
    reaction: row[4] as CatReaction,
    damaged: row[5] as number,
    created_at: row[6] as string,
  };
}

export function addCat(cat: Omit<Cat, 'id' | 'created_at' | 'color'> & { color?: string }): Cat {
  const database = getDb();
  const color = cat.color || CAT_COLORS[Math.floor(Math.random() * CAT_COLORS.length)];
  const personalityJson = JSON.stringify(cat.personality);
  
  const stmt = database.prepare(
    'INSERT INTO cats (name, avatar, breed, age, personality, color) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run([cat.name, cat.avatar || null, cat.breed, cat.age, personalityJson, color]);
  stmt.free();
  
  const result = database.exec('SELECT last_insert_rowid()');
  const id = result[0].values[0][0] as number;
  
  const newCat: Cat = {
    id,
    name: cat.name,
    avatar: cat.avatar,
    breed: cat.breed,
    age: cat.age,
    personality: cat.personality,
    color,
    created_at: new Date().toISOString(),
  };
  
  initializeCatToys(id);
  
  return newCat;
}

function initializeCatToys(catId: number): void {
  const database = getDb();
  const selectedToys = PRESET_TOYS.slice(0, 10);
  
  const stmt = database.prepare(
    'INSERT INTO toys (name, type, material, danger_level, is_custom, cat_id) VALUES (?, ?, ?, ?, 0, ?)'
  );
  
  for (const toy of selectedToys) {
    stmt.run([toy.name, toy.type, toy.material, toy.danger_level, catId]);
  }
  
  stmt.free();
}

export function getCats(): Cat[] {
  const database = getDb();
  const result = database.exec('SELECT * FROM cats ORDER BY created_at DESC');
  if (!result.length) return [];
  return result[0].values.map(rowToCat);
}

export function getCatById(id: number): Cat | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM cats WHERE id = ?');
  stmt.run([id]);
  const result = stmt.getAsObject() as any;
  stmt.free();
  
  if (!result || !result.id) return null;
  
  return {
    ...result,
    personality: JSON.parse(result.personality),
  } as Cat;
}

export function deleteCat(id: number): void {
  const database = getDb();
  database.run('DELETE FROM interactions WHERE cat_id = ?', [id]);
  database.run('DELETE FROM toys WHERE cat_id = ?', [id]);
  database.run('DELETE FROM cats WHERE id = ?', [id]);
}

export function addToy(toy: Omit<Toy, 'id' | 'created_at' | 'is_custom'> & { is_custom?: number }): Toy {
  const database = getDb();
  const isCustom = toy.is_custom ?? 1;
  
  const stmt = database.prepare(
    'INSERT INTO toys (name, type, material, danger_level, image, description, is_custom, cat_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run([
    toy.name, toy.type, toy.material, toy.danger_level,
    toy.image || null, toy.description || null, isCustom, toy.cat_id
  ]);
  stmt.free();
  
  const result = database.exec('SELECT last_insert_rowid()');
  const id = result[0].values[0][0] as number;
  
  return {
    id,
    name: toy.name,
    type: toy.type,
    material: toy.material,
    danger_level: toy.danger_level,
    image: toy.image,
    description: toy.description,
    is_custom: isCustom,
    cat_id: toy.cat_id,
    created_at: new Date().toISOString(),
  };
}

export function getToysByCatId(catId: number): Toy[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM toys WHERE cat_id = ? ORDER BY created_at DESC');
  stmt.run([catId]);
  const result: any[] = [];
  
  let row;
  while ((row = stmt.getAsObject()) as any) {
    if (!row.id) break;
    result.push([
      row.id, row.name, row.type, row.material, row.danger_level,
      row.image, row.description, row.is_custom, row.cat_id, row.created_at
    ]);
  }
  stmt.free();
  
  return result.map(rowToToy);
}

export function getToyById(id: number): Toy | null {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM toys WHERE id = ?');
  stmt.run([id]);
  const result = stmt.getAsObject() as any;
  stmt.free();
  
  if (!result || !result.id) return null;
  return result as Toy;
}

export function deleteToy(id: number): void {
  const database = getDb();
  database.run('DELETE FROM interactions WHERE toy_id = ?', [id]);
  database.run('DELETE FROM toys WHERE id = ?', [id]);
}

export function addInteraction(record: Omit<InteractionRecord, 'id' | 'created_at'>): InteractionRecord {
  const database = getDb();
  
  const stmt = database.prepare(
    'INSERT INTO interactions (toy_id, cat_id, duration, reaction, damaged) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run([record.toy_id, record.cat_id, record.duration, record.reaction, record.damaged]);
  stmt.free();
  
  const result = database.exec('SELECT last_insert_rowid()');
  const id = result[0].values[0][0] as number;
  
  return {
    id,
    ...record,
    created_at: new Date().toISOString(),
  };
}

export function getInteractionsByToyId(toyId: number): InteractionRecord[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM interactions WHERE toy_id = ? ORDER BY created_at DESC');
  stmt.run([toyId]);
  const result: any[] = [];
  
  let row;
  while ((row = stmt.getAsObject()) as any) {
    if (!row.id) break;
    result.push([
      row.id, row.toy_id, row.cat_id, row.duration,
      row.reaction, row.damaged, row.created_at
    ]);
  }
  stmt.free();
  
  return result.map(rowToInteraction);
}

export function getInteractionsByCatId(catId: number): InteractionRecord[] {
  const database = getDb();
  const stmt = database.prepare('SELECT * FROM interactions WHERE cat_id = ? ORDER BY created_at DESC');
  stmt.run([catId]);
  const result: any[] = [];
  
  let row;
  while ((row = stmt.getAsObject()) as any) {
    if (!row.id) break;
    result.push([
      row.id, row.toy_id, row.cat_id, row.duration,
      row.reaction, row.damaged, row.created_at
    ]);
  }
  stmt.free();
  
  return result.map(rowToInteraction);
}

export function getToyUsageCount(toyId: number): number {
  const database = getDb();
  const result = database.exec(
    `SELECT COUNT(*) FROM interactions WHERE toy_id = ${toyId}`
  );
  return result[0]?.values[0]?.[0] as number || 0;
}

export function getToyLastInteraction(toyId: number): string | null {
  const database = getDb();
  const result = database.exec(
    `SELECT MAX(created_at) FROM interactions WHERE toy_id = ${toyId}`
  );
  const value = result[0]?.values[0]?.[0];
  return value ? (value as string) : null;
}

export function getDailyStats(toyId: number, days: number = 14): DailyStats[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT 
      date(created_at) as day,
      SUM(duration) as total_duration
    FROM interactions 
    WHERE toy_id = ? 
      AND created_at >= date('now', ?)
    GROUP BY date(created_at)
    ORDER BY day ASC
  `);
  stmt.run([toyId, `-${days} days`]);
  const result: { day: string; total_duration: number }[] = [];
  
  let row;
  while ((row = stmt.getAsObject()) as any) {
    if (!row.day) break;
    result.push({ day: row.day as string, total_duration: row.total_duration as number });
  }
  stmt.free();
  
  const statsMap = new Map(result.map(r => [r.day, r.total_duration]));
  const dailyStats: DailyStats[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyStats.push({
      date: dateStr,
      total_duration: statsMap.get(dateStr) || 0,
    });
  }
  
  return dailyStats;
}

export function checkInterestDecline(toyId: number): boolean {
  const dailyStats = getDailyStats(toyId, 7);
  const last5Days = dailyStats.slice(-5);
  return last5Days.every(d => d.total_duration === 0);
}

export function getTopToyTypesForCat(catId: number): ToyType[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT t.type, COUNT(*) as excited_count
    FROM interactions i
    JOIN toys t ON i.toy_id = t.id
    WHERE i.cat_id = ? AND i.reaction = 'excited'
    GROUP BY t.type
    ORDER BY excited_count DESC
  `);
  stmt.run([catId]);
  const result: ToyType[] = [];
  
  let row;
  while ((row = stmt.getAsObject()) as any) {
    if (!row.type) break;
    result.push(row.type as ToyType);
  }
  stmt.free();
  
  if (result.length === 0) {
    return ['chase', 'scratch', 'puzzle'];
  }
  
  return result;
}

export function getOwnedToyNamesByCatId(catId: number): Set<string> {
  const toys = getToysByCatId(catId);
  return new Set(toys.map(t => t.name));
}

export function getRecommendationsForCat(catId: number): { toy: typeof PRESET_TOYS[0]; owned: boolean }[] {
  const topTypes = getTopToyTypesForCat(catId);
  const ownedNames = getOwnedToyNamesByCatId(catId);
  
  const recommendations: { toy: typeof PRESET_TOYS[0]; owned: boolean }[] = [];
  
  for (const type of topTypes) {
    const typeToys = PRESET_TOYS.filter(t => t.type === type);
    for (const toy of typeToys) {
      if (!recommendations.find(r => r.toy.name === toy.name)) {
        recommendations.push({
          toy,
          owned: ownedNames.has(toy.name),
        });
      }
    }
  }
  
  for (const toy of PRESET_TOYS) {
    if (!recommendations.find(r => r.toy.name === toy.name)) {
      recommendations.push({
        toy,
        owned: ownedNames.has(toy.name),
      });
    }
  }
  
  return recommendations.slice(0, 12);
}

export function getAllPresetToys() {
  return PRESET_TOYS;
}
