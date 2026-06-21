import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const dbDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'secretsanta.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    roomCode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    eventDate TEXT NOT NULL,
    minPrice INTEGER NOT NULL DEFAULT 0,
    maxPrice INTEGER NOT NULL DEFAULT 0,
    exchangeDeadline TEXT NOT NULL,
    exclusionPairs TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    roomId TEXT NOT NULL,
    nickname TEXT NOT NULL,
    address TEXT,
    email TEXT,
    giftSent INTEGER NOT NULL DEFAULT 0,
    giftReceived INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roomId) REFERENCES rooms(id)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    roomId TEXT NOT NULL,
    giverId TEXT NOT NULL,
    receiverId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roomId) REFERENCES rooms(id),
    FOREIGN KEY (giverId) REFERENCES participants(id),
    FOREIGN KEY (receiverId) REFERENCES participants(id)
  );

  CREATE TABLE IF NOT EXISTS wishlists (
    id TEXT PRIMARY KEY,
    participantId TEXT NOT NULL,
    itemName TEXT NOT NULL,
    description TEXT,
    preference TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participantId) REFERENCES participants(id)
  );

  CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(roomId);
  CREATE INDEX IF NOT EXISTS idx_assignments_room ON assignments(roomId);
  CREATE INDEX IF NOT EXISTS idx_wishlists_participant ON wishlists(participantId);
`);

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  eventDate: string;
  minPrice: number;
  maxPrice: number;
  exchangeDeadline: string;
  exclusionPairs: string;
  status: 'pending' | 'active' | 'completed';
  createdAt: string;
}

export interface Participant {
  id: string;
  roomId: string;
  nickname: string;
  address: string | null;
  email: string | null;
  giftSent: number;
  giftReceived: number;
  createdAt: string;
}

export interface Assignment {
  id: string;
  roomId: string;
  giverId: string;
  receiverId: string;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  participantId: string;
  itemName: string;
  description: string | null;
  preference: string | null;
  createdAt: string;
}

export interface WishlistItemInput {
  itemName: string;
  description?: string;
  preference?: string;
}

export function createRoom(
  id: string,
  roomCode: string,
  name: string,
  eventDate: string,
  minPrice: number,
  maxPrice: number,
  exchangeDeadline: string,
  exclusionPairs: [string, string][]
): Room {
  const stmt = db.prepare(`
    INSERT INTO rooms (id, roomCode, name, eventDate, minPrice, maxPrice, exchangeDeadline, exclusionPairs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, roomCode, name, eventDate, minPrice, maxPrice, exchangeDeadline, JSON.stringify(exclusionPairs));
  return getRoomById(id)!;
}

export function getRoomById(id: string): Room | undefined {
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room | undefined;
}

export function getRoomByCode(roomCode: string): Room | undefined {
  return db.prepare('SELECT * FROM rooms WHERE roomCode = ?').get(roomCode) as Room | undefined;
}

export function getAllRooms(): Room[] {
  return db.prepare('SELECT * FROM rooms ORDER BY createdAt DESC').all() as Room[];
}

export function updateRoomStatus(roomId: string, status: Room['status']): void {
  db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(status, roomId);
}

export function addParticipant(
  id: string,
  roomId: string,
  nickname: string,
  address: string | null,
  email: string | null,
  wishlistItems: WishlistItemInput[]
): Participant {
  const insertParticipant = db.prepare(`
    INSERT INTO participants (id, roomId, nickname, address, email)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertWishlist = db.prepare(`
    INSERT INTO wishlists (id, participantId, itemName, description, preference)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    insertParticipant.run(id, roomId, nickname, address, email);
    wishlistItems.forEach((item) => {
      const wishlistId = uuidv4();
      insertWishlist.run(
        wishlistId,
        id,
        item.itemName,
        item.description || null,
        item.preference || null
      );
    });
  });
  tx();

  return getParticipantById(id)!;
}

export function getParticipantById(id: string): Participant | undefined {
  return db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as Participant | undefined;
}

export function getParticipantsByRoom(roomId: string): Participant[] {
  return db.prepare('SELECT * FROM participants WHERE roomId = ? ORDER BY createdAt').all() as Participant[];
}

export function getWishlistByParticipant(participantId: string): WishlistItem[] {
  return db.prepare('SELECT * FROM wishlists WHERE participantId = ? ORDER BY createdAt').all() as WishlistItem[];
}

export function addAssignments(assignments: { id: string; roomId: string; giverId: string; receiverId: string }[]): void {
  const stmt = db.prepare(`
    INSERT INTO assignments (id, roomId, giverId, receiverId)
    VALUES (?, ?, ?, ?)
  `);
  const tx = db.transaction(() => {
    assignments.forEach((a) => stmt.run(a.id, a.roomId, a.giverId, a.receiverId));
  });
  tx();
}

export function getAssignmentByGiver(giverId: string): (Assignment & { receiver: Participant; receiverWishlist: WishlistItem[] }) | undefined {
  const assignment = db.prepare('SELECT * FROM assignments WHERE giverId = ?').get(giverId) as Assignment | undefined;
  if (!assignment) return undefined;
  const receiver = getParticipantById(assignment.receiverId);
  if (!receiver) return undefined;
  const receiverWishlist = getWishlistByParticipant(assignment.receiverId);
  return { ...assignment, receiver, receiverWishlist };
}

export function getAssignmentsByRoom(roomId: string): Assignment[] {
  return db.prepare('SELECT * FROM assignments WHERE roomId = ?').all() as Assignment[];
}

export function markGiftSent(userId: string): void {
  db.prepare('UPDATE participants SET giftSent = 1 WHERE id = ?').run(userId);
}

export function markGiftReceived(userId: string): { giverId: string; giverNickname: string } | null {
  const assignment = db.prepare('SELECT giverId FROM assignments WHERE receiverId = ?').get(userId) as { giverId: string } | undefined;
  if (!assignment) return null;
  db.prepare('UPDATE participants SET giftReceived = 1 WHERE id = ?').run(userId);
  const giver = getParticipantById(assignment.giverId);
  return giver ? { giverId: assignment.giverId, giverNickname: giver.nickname } : null;
}

export function getRoomStats(roomId: string): { total: number; sent: number; received: number } {
  const total = db.prepare('SELECT COUNT(*) as count FROM participants WHERE roomId = ?').get(roomId) as { count: number };
  const sent = db.prepare('SELECT COUNT(*) as count FROM participants WHERE roomId = ? AND giftSent = 1').get(roomId) as { count: number };
  const received = db.prepare('SELECT COUNT(*) as count FROM participants WHERE roomId = ? AND giftReceived = 1').get(roomId) as { count: number };
  return { total: total.count, sent: sent.count, received: received.count };
}

export { db };
