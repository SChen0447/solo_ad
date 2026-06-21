import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'travel.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS travels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pois (
    id TEXT PRIMARY KEY,
    travel_id TEXT NOT NULL,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    arrived_at TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_urls TEXT NOT NULL DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (travel_id) REFERENCES travels(id) ON DELETE CASCADE
  );
`);

export interface Travel {
  id: string;
  name: string;
  city: string;
  start_date: string;
  end_date: string;
  summary: string;
  created_at: string;
}

export interface POI {
  id: string;
  travel_id: string;
  name: string;
  latitude: number;
  longitude: number;
  arrived_at: string;
  description: string;
  image_urls: string;
  created_at: string;
}

export interface POIWithParsedImages extends Omit<POI, 'image_urls'> {
  image_urls: string[];
}

export function getAllTravels(): Travel[] {
  return db.prepare('SELECT * FROM travels ORDER BY created_at DESC').all() as Travel[];
}

export function getTravelById(id: string): Travel | undefined {
  return db.prepare('SELECT * FROM travels WHERE id = ?').get(id) as Travel | undefined;
}

export function createTravel(data: Omit<Travel, 'id' | 'created_at'>): Travel {
  const id = uuidv4();
  db.prepare(
    'INSERT INTO travels (id, name, city, start_date, end_date, summary) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, data.name, data.city, data.start_date, data.end_date, data.summary);
  return getTravelById(id)!;
}

export function getPOIsByTravelId(travelId: string): POIWithParsedImages[] {
  const rows = db.prepare('SELECT * FROM pois WHERE travel_id = ? ORDER BY arrived_at ASC').all(travelId) as POI[];
  return rows.map((row) => ({
    ...row,
    image_urls: JSON.parse(row.image_urls) as string[],
  }));
}

export function createPOI(data: Omit<POI, 'id' | 'created_at'> & { image_urls: string[] }): POIWithParsedImages {
  const id = uuidv4();
  const imageUrlsJson = JSON.stringify(data.image_urls);
  db.prepare(
    'INSERT INTO pois (id, travel_id, name, latitude, longitude, arrived_at, description, image_urls) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, data.travel_id, data.name, data.latitude, data.longitude, data.arrived_at, data.description, imageUrlsJson);
  const row = db.prepare('SELECT * FROM pois WHERE id = ?').get(id) as POI;
  return { ...row, image_urls: JSON.parse(row.image_urls) as string[] };
}

export function getRouteByTravelId(travelId: string): POIWithParsedImages[] {
  return getPOIsByTravelId(travelId);
}

export function deleteTravel(id: string): boolean {
  const result = db.prepare('DELETE FROM travels WHERE id = ?').run(id);
  return result.changes > 0;
}

export function deletePOI(id: string): boolean {
  const result = db.prepare('DELETE FROM pois WHERE id = ?').run(id);
  return result.changes > 0;
}
