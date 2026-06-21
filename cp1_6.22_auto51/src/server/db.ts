import Database from 'better-sqlite3';
import type { Room, Vote, Comment, VoteType, VoteResult, VoterInfo } from '../shared/types';

const db = new Database(':memory:');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    adminKey TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    options TEXT NOT NULL,
    voteType TEXT NOT NULL,
    isEnded INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    roomId TEXT NOT NULL,
    voterId TEXT NOT NULL,
    voterName TEXT,
    selections TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_room_voter ON votes(roomId, voterId);

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    roomId TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_comments_room ON comments(roomId);
  CREATE INDEX IF NOT EXISTS idx_rooms_createdAt ON rooms(createdAt);
`);

function rowToRoom(row: any): Room {
  return {
    id: row.id,
    code: row.code,
    adminKey: row.adminKey,
    title: row.title,
    description: row.description || '',
    options: JSON.parse(row.options),
    voteType: row.voteType as VoteType,
    isEnded: row.isEnded === 1,
    createdAt: row.createdAt,
  };
}

function rowToVote(row: any): Vote {
  return {
    id: row.id,
    roomId: row.roomId,
    voterId: row.voterId,
    voterName: row.voterName,
    selections: JSON.parse(row.selections),
    createdAt: row.createdAt,
  };
}

function rowToComment(row: any): Comment {
  return {
    id: row.id,
    roomId: row.roomId,
    content: row.content,
    createdAt: row.createdAt,
  };
}

export function insertRoom(
  id: string,
  code: string,
  adminKey: string,
  title: string,
  description: string,
  options: string[],
  voteType: VoteType
): Room {
  const createdAt = Date.now();
  const stmt = db.prepare(
    'INSERT INTO rooms (id, code, adminKey, title, description, options, voteType, isEnded, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
  );
  stmt.run(id, code, adminKey, title, description, JSON.stringify(options), voteType, createdAt);
  return getRoomByCode(code)!;
}

export function getRoomByCode(code: string): Room | null {
  const row = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code);
  return row ? rowToRoom(row) : null;
}

export function getRoomById(id: string): Room | null {
  const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  return row ? rowToRoom(row) : null;
}

export function endRoom(code: string): void {
  db.prepare('UPDATE rooms SET isEnded = 1 WHERE code = ?').run(code);
}

export function deleteRoom(code: string): void {
  db.prepare('DELETE FROM rooms WHERE code = ?').run(code);
}

export function resetVotes(roomId: string): void {
  db.prepare('DELETE FROM votes WHERE roomId = ?').run(roomId);
  db.prepare('DELETE FROM comments WHERE roomId = ?').run(roomId);
}

export function upsertVote(
  id: string,
  roomId: string,
  voterId: string,
  voterName: string | null,
  selections: number[]
): void {
  const existing = db
    .prepare('SELECT id FROM votes WHERE roomId = ? AND voterId = ?')
    .get(roomId, voterId);
  const createdAt = Date.now();
  if (existing) {
    db.prepare('UPDATE votes SET voterName = ?, selections = ?, createdAt = ? WHERE id = ?').run(
      voterName,
      JSON.stringify(selections),
      createdAt,
      (existing as any).id
    );
  } else {
    db.prepare(
      'INSERT INTO votes (id, roomId, voterId, voterName, selections, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, roomId, voterId, voterName, JSON.stringify(selections), createdAt);
  }
}

export function getVotesByRoom(roomId: string): Vote[] {
  const rows = db.prepare('SELECT * FROM votes WHERE roomId = ?').all(roomId);
  return rows.map(rowToVote);
}

export function insertComment(id: string, roomId: string, content: string): Comment {
  const createdAt = Date.now();
  db.prepare('INSERT INTO comments (id, roomId, content, createdAt) VALUES (?, ?, ?, ?)').run(
    id,
    roomId,
    content,
    createdAt
  );
  return { id, roomId, content, createdAt };
}

export function getCommentsByRoom(roomId: string): Comment[] {
  const rows = db
    .prepare('SELECT * FROM comments WHERE roomId = ? ORDER BY createdAt DESC')
    .all(roomId);
  return rows.map(rowToComment);
}

export function computeResults(room: Room): { results: VoteResult[]; totalVotes: number } {
  const votes = getVotesByRoom(room.id);
  const totalVotes = votes.length;
  const options = room.options;

  const results: VoteResult[] = options.map((opt, idx) => ({
    optionIndex: idx,
    optionText: opt,
    count: 0,
    percentage: 0,
    weightedScore: room.voteType === 'ranking' ? 0 : undefined,
    voters: [] as VoterInfo[],
  }));

  for (const vote of votes) {
    vote.selections.forEach((optIdx, rankIdx) => {
      if (optIdx >= 0 && optIdx < results.length) {
        results[optIdx].count += 1;
        results[optIdx].voters.push({
          voterId: vote.voterId,
          voterName: vote.voterName,
        });
        if (room.voteType === 'ranking') {
          const weight = options.length - rankIdx;
          results[optIdx].weightedScore = (results[optIdx].weightedScore || 0) + weight;
        }
      }
    });
  }

  for (const r of results) {
    r.percentage = totalVotes > 0 ? Math.round((r.count / totalVotes) * 100) : 0;
  }

  return { results, totalVotes };
}

export function cleanupExpired(): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const info = db.prepare('DELETE FROM rooms WHERE createdAt < ?').run(cutoff);
  return info.changes;
}

export default db;
