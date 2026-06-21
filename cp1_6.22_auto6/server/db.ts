import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'mindmap.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export interface MindMap {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  share_token: string | null;
}

export interface Node {
  id: string;
  mindmap_id: string;
  parent_id: string | null;
  text: string;
  x: number;
  y: number;
  level: number;
  bg_color: string | null;
  border_width: number;
  font_bold: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS mindmaps (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    share_token TEXT
  );

  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    mindmap_id TEXT NOT NULL,
    parent_id TEXT,
    text TEXT NOT NULL DEFAULT '',
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 0,
    bg_color TEXT,
    border_width INTEGER NOT NULL DEFAULT 1,
    font_bold INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_nodes_mindmap ON nodes(mindmap_id);
  CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);
  CREATE INDEX IF NOT EXISTS idx_mindmaps_share ON mindmaps(share_token);
`);

export function createMindMap(id: string, title: string): MindMap {
  const stmt = db.prepare(
    'INSERT INTO mindmaps (id, title) VALUES (?, ?)'
  );
  stmt.run(id, title);
  return getMindMap(id)!;
}

export function getMindMap(id: string): MindMap | undefined {
  const stmt = db.prepare('SELECT * FROM mindmaps WHERE id = ?');
  return stmt.get(id) as MindMap | undefined;
}

export function getMindMapByShareToken(token: string): MindMap | undefined {
  const stmt = db.prepare('SELECT * FROM mindmaps WHERE share_token = ?');
  return stmt.get(token) as MindMap | undefined;
}

export function listMindMaps(): MindMap[] {
  const stmt = db.prepare('SELECT * FROM mindmaps ORDER BY updated_at DESC');
  return stmt.all() as MindMap[];
}

export function deleteMindMap(id: string): void {
  const stmt = db.prepare('DELETE FROM mindmaps WHERE id = ?');
  stmt.run(id);
}

export function updateMindMapTimestamp(id: string): void {
  const stmt = db.prepare(
    'UPDATE mindmaps SET updated_at = datetime(\'now\') WHERE id = ?'
  );
  stmt.run(id);
}

export function setShareToken(id: string, token: string): void {
  const stmt = db.prepare('UPDATE mindmaps SET share_token = ? WHERE id = ?');
  stmt.run(token, id);
}

export function getNodes(mindmapId: string): Node[] {
  const stmt = db.prepare('SELECT * FROM nodes WHERE mindmap_id = ? ORDER BY created_at ASC');
  return stmt.all(mindmapId) as Node[];
}

export function createNode(node: Omit<Node, 'created_at' | 'updated_at'>): Node {
  const stmt = db.prepare(`
    INSERT INTO nodes (id, mindmap_id, parent_id, text, x, y, level, bg_color, border_width, font_bold, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    node.id,
    node.mindmap_id,
    node.parent_id,
    node.text,
    node.x,
    node.y,
    node.level,
    node.bg_color,
    node.border_width,
    node.font_bold,
    node.note
  );
  updateMindMapTimestamp(node.mindmap_id);
  return getNode(node.id)!;
}

export function getNode(id: string): Node | undefined {
  const stmt = db.prepare('SELECT * FROM nodes WHERE id = ?');
  return stmt.get(id) as Node | undefined;
}

export function updateNode(id: string, updates: Partial<Omit<Node, 'id' | 'mindmap_id' | 'created_at'>>): Node {
  const existing = getNode(id);
  if (!existing) throw new Error('Node not found');

  const fields: string[] = [];
  const values: any[] = [];

  const allowedFields = ['parent_id', 'text', 'x', 'y', 'level', 'bg_color', 'border_width', 'font_bold', 'note'];
  for (const key of allowedFields) {
    if (key in updates) {
      fields.push(`${key} = ?`);
      values.push((updates as any)[key]);
    }
  }

  if (fields.length > 0) {
    fields.push('updated_at = datetime(\'now\')');
    values.push(id);
    const stmt = db.prepare(`UPDATE nodes SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  updateMindMapTimestamp(existing.mindmap_id);
  return getNode(id)!;
}

export function deleteNode(id: string): string | null {
  const node = getNode(id);
  if (!node) return null;
  const stmt = db.prepare('DELETE FROM nodes WHERE id = ?');
  stmt.run(id);
  updateMindMapTimestamp(node.mindmap_id);
  return node.mindmap_id;
}

export default db;
