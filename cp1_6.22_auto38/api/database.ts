import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Project,
  Member,
  Tag,
  TimeEntry,
  CreateProjectPayload,
  CreateMemberPayload,
  CreateEntryPayload,
  CreateTagPayload,
} from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '..', 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const THEME_COLORS = [
  '#E53E3E',
  '#DD6B20',
  '#D69E2E',
  '#38A169',
  '#319795',
  '#3182CE',
  '#5A67D8',
  '#805AD5',
  '#D53F8C',
  '#2B6CB0',
];

const TAG_COLORS = THEME_COLORS;

function initTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      nickname TEXT NOT NULL,
      email TEXT NOT NULL,
      theme_color TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      hours REAL NOT NULL CHECK(hours >= 0.5 AND hours <= 24),
      description TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS entry_tag (
      entry_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (entry_id, tag_id),
      FOREIGN KEY (entry_id) REFERENCES time_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_entries_date ON time_entries(date);
    CREATE INDEX IF NOT EXISTS idx_entries_member ON time_entries(member_id);
    CREATE INDEX IF NOT EXISTS idx_entries_project ON time_entries(project_id);
  `);
}

initTables();

function mapProject(row: { id: number; name: string; created_at: string; member_count?: number }): Project {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    memberCount: row.member_count,
  };
}

function mapMember(row: { id: number; project_id: number; nickname: string; email: string; theme_color: string }): Member {
  return {
    id: row.id,
    projectId: row.project_id,
    nickname: row.nickname,
    email: row.email,
    themeColor: row.theme_color,
  };
}

function mapTag(row: { id: number; project_id: number; name: string; color: string }): Tag {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    color: row.color,
  };
}

export function getProjects(): Project[] {
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM members m WHERE m.project_id = p.id) as member_count
       FROM projects p ORDER BY p.created_at DESC`
    )
    .all() as Array<{ id: number; name: string; created_at: string; member_count: number }>;
  return rows.map(mapProject);
}

export function getProjectById(id: number): Project | null {
  const row = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM members m WHERE m.project_id = p.id) as member_count
       FROM projects p WHERE p.id = ?`
    )
    .get(id) as { id: number; name: string; created_at: string; member_count: number } | undefined;
  return row ? mapProject(row) : null;
}

export function createProject(payload: CreateProjectPayload): Project {
  const tx = db.transaction((name: string, members: CreateMemberPayload[]) => {
    const result = db.prepare('INSERT INTO projects (name) VALUES (?)').run(name);
    const projectId = result.lastInsertRowid as number;

    const insertMember = db.prepare(
      'INSERT INTO members (project_id, nickname, email, theme_color) VALUES (?, ?, ?, ?)'
    );

    members.forEach((m, idx) => {
      const color = THEME_COLORS[idx % THEME_COLORS.length];
      insertMember.run(projectId, m.nickname, m.email, color);
    });

    return projectId;
  });

  const projectId = tx(payload.name, payload.members);
  return getProjectById(projectId) as Project;
}

export function getMembersByProject(projectId: number): Member[] {
  const rows = db
    .prepare('SELECT * FROM members WHERE project_id = ? ORDER BY id')
    .all(projectId) as Array<{ id: number; project_id: number; nickname: string; email: string; theme_color: string }>;
  return rows.map(mapMember);
}

export function addMember(projectId: number, payload: CreateMemberPayload): Member {
  const members = getMembersByProject(projectId);
  const color = THEME_COLORS[members.length % THEME_COLORS.length];
  const result = db
    .prepare('INSERT INTO members (project_id, nickname, email, theme_color) VALUES (?, ?, ?, ?)')
    .run(projectId, payload.nickname, payload.email, color);
  return db
    .prepare('SELECT * FROM members WHERE id = ?')
    .get(result.lastInsertRowid) as Member;
}

export function getTagsByProject(projectId: number): Tag[] {
  const rows = db
    .prepare('SELECT * FROM tags WHERE project_id = ? ORDER BY id')
    .all(projectId) as Array<{ id: number; project_id: number; name: string; color: string }>;
  return rows.map(mapTag);
}

export function addTag(projectId: number, payload: CreateTagPayload): Tag {
  const tags = getTagsByProject(projectId);
  const color = TAG_COLORS[tags.length % TAG_COLORS.length];
  const result = db
    .prepare('INSERT INTO tags (project_id, name, color) VALUES (?, ?, ?)')
    .run(projectId, payload.name, color);
  const row = db
    .prepare('SELECT * FROM tags WHERE id = ?')
    .get(result.lastInsertRowid) as { id: number; project_id: number; name: string; color: string };
  return mapTag(row);
}

export function deleteTag(tagId: number): void {
  db.prepare('DELETE FROM tags WHERE id = ?').run(tagId);
}

function getTagsForEntry(entryId: number): Tag[] {
  const rows = db
    .prepare(
      `SELECT t.* FROM tags t
       INNER JOIN entry_tag et ON et.tag_id = t.id
       WHERE et.entry_id = ?`
    )
    .all(entryId) as Array<{ id: number; project_id: number; name: string; color: string }>;
  return rows.map(mapTag);
}

export function getEntriesByProject(
  projectId: number,
  period: 'week' | 'month',
  anchorDate: string
): TimeEntry[] {
  const anchor = new Date(anchorDate);
  let start: Date;
  let end: Date;

  if (period === 'week') {
    start = new Date(anchor);
    start.setDate(anchor.getDate() - 6);
    end = new Date(anchor);
  } else {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  }

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `SELECT te.*, m.nickname, m.theme_color, m.email
       FROM time_entries te
       INNER JOIN members m ON m.id = te.member_id
       WHERE te.project_id = ? AND te.date >= ? AND te.date <= ?
       ORDER BY te.date ASC, te.id ASC`
    )
    .all(projectId, startStr, endStr) as Array<{
    id: number;
    project_id: number;
    member_id: number;
    date: string;
    hours: number;
    description: string;
    nickname: string;
    theme_color: string;
    email: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    memberId: row.member_id,
    date: row.date,
    hours: row.hours,
    description: row.description,
    tags: getTagsForEntry(row.id),
    member: {
      id: row.member_id,
      projectId: row.project_id,
      nickname: row.nickname,
      email: row.email,
      themeColor: row.theme_color,
    },
  }));
}

export function createEntry(projectId: number, payload: CreateEntryPayload): TimeEntry {
  const tx = db.transaction(() => {
    const result = db
      .prepare(
        'INSERT INTO time_entries (project_id, member_id, date, hours, description) VALUES (?, ?, ?, ?, ?)'
      )
      .run(projectId, payload.memberId, payload.date, payload.hours, payload.description);
    const entryId = result.lastInsertRowid as number;

    const insertLink = db.prepare('INSERT OR IGNORE INTO entry_tag (entry_id, tag_id) VALUES (?, ?)');
    payload.tagIds.forEach((tagId) => insertLink.run(entryId, tagId));

    return entryId;
  });

  const entryId = tx();
  const row = db
    .prepare(
      `SELECT te.*, m.nickname, m.theme_color, m.email
       FROM time_entries te
       INNER JOIN members m ON m.id = te.member_id
       WHERE te.id = ?`
    )
    .get(entryId) as {
    id: number;
    project_id: number;
    member_id: number;
    date: string;
    hours: number;
    description: string;
    nickname: string;
    theme_color: string;
    email: string;
  };

  return {
    id: row.id,
    projectId: row.project_id,
    memberId: row.member_id,
    date: row.date,
    hours: row.hours,
    description: row.description,
    tags: getTagsForEntry(row.id),
    member: {
      id: row.member_id,
      projectId: row.project_id,
      nickname: row.nickname,
      email: row.email,
      themeColor: row.theme_color,
    },
  };
}

export function deleteEntry(entryId: number): void {
  db.prepare('DELETE FROM time_entries WHERE id = ?').run(entryId);
}
