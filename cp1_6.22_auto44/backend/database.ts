import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('./calendar.db');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface Member {
  id: string;
  team_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  member_id: string;
  team_id: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface Event {
  id: string;
  team_id: string;
  title: string;
  start_time: string;
  end_time: string;
  category: 'work' | 'personal' | 'team';
  created_at: string;
}

export interface ConflictResult {
  availableSlots: { start: string; end: string }[];
  partialConflicts: { start: string; end: string; availableCount: number; conflictMembers: { id: string; name: string; overlapMinutes: number }[] }[];
  allMembers: Member[];
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_slots (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'team',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );
  `);
}

initTables();

const MEMBER_COLORS = [
  '#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#319795',
  '#3182ce', '#5a67d8', '#805ad5', '#d53f8c', '#e53e3e'
];

export function createTeam(name: string): Team {
  const id = uuidv4();
  const inviteCode = uuidv4().slice(0, 8).toUpperCase();
  const stmt = db.prepare('INSERT INTO teams (id, name, invite_code) VALUES (?, ?, ?)');
  stmt.run(id, name, inviteCode);
  return getTeam(id) as Team;
}

export function getTeam(id: string): Team | undefined {
  const stmt = db.prepare('SELECT * FROM teams WHERE id = ?');
  return stmt.get(id) as Team | undefined;
}

export function getTeamByInviteCode(inviteCode: string): Team | undefined {
  const stmt = db.prepare('SELECT * FROM teams WHERE invite_code = ?');
  return stmt.get(inviteCode) as Team | undefined;
}

export function addMember(teamId: string, name: string, color?: string): Member {
  const id = uuidv4();
  const members = getMembers(teamId);
  const memberColor = color || MEMBER_COLORS[members.length % MEMBER_COLORS.length];
  const stmt = db.prepare('INSERT INTO members (id, team_id, name, color) VALUES (?, ?, ?, ?)');
  stmt.run(id, teamId, name, memberColor);
  return getMember(id) as Member;
}

export function getMember(id: string): Member | undefined {
  const stmt = db.prepare('SELECT * FROM members WHERE id = ?');
  return stmt.get(id) as Member | undefined;
}

export function getMembers(teamId: string): Member[] {
  const stmt = db.prepare('SELECT * FROM members WHERE team_id = ? ORDER BY created_at');
  return stmt.all(teamId) as Member[];
}

export function updateMemberColor(memberId: string, color: string): void {
  const stmt = db.prepare('UPDATE members SET color = ? WHERE id = ?');
  stmt.run(color, memberId);
}

export function addTimeSlot(memberId: string, teamId: string, startTime: string, endTime: string): TimeSlot {
  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO time_slots (id, member_id, team_id, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, memberId, teamId, startTime, endTime);
  return getTimeSlot(id) as TimeSlot;
}

export function getTimeSlot(id: string): TimeSlot | undefined {
  const stmt = db.prepare('SELECT * FROM time_slots WHERE id = ?');
  return stmt.get(id) as TimeSlot | undefined;
}

export function getTimeSlotsByTeam(teamId: string): TimeSlot[] {
  const stmt = db.prepare('SELECT * FROM time_slots WHERE team_id = ? ORDER BY start_time');
  return stmt.all(teamId) as TimeSlot[];
}

export function getTimeSlotsByMember(memberId: string): TimeSlot[] {
  const stmt = db.prepare('SELECT * FROM time_slots WHERE member_id = ? ORDER BY start_time');
  return stmt.all(memberId) as TimeSlot[];
}

export function deleteTimeSlot(id: string): void {
  const stmt = db.prepare('DELETE FROM time_slots WHERE id = ?');
  stmt.run(id);
}

export function createEvent(teamId: string, title: string, startTime: string, endTime: string, category: 'work' | 'personal' | 'team' = 'team'): Event {
  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO events (id, team_id, title, start_time, end_time, category) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(id, teamId, title, startTime, endTime, category);
  return getEvent(id) as Event;
}

export function getEvent(id: string): Event | undefined {
  const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
  return stmt.get(id) as Event | undefined;
}

export function getEventsByTeam(teamId: string): Event[] {
  const stmt = db.prepare('SELECT * FROM events WHERE team_id = ? ORDER BY start_time');
  return stmt.all(teamId) as Event[];
}

export function updateEvent(id: string, title: string, startTime: string, endTime: string, category: string): Event | undefined {
  const stmt = db.prepare('UPDATE events SET title = ?, start_time = ?, end_time = ?, category = ? WHERE id = ?');
  stmt.run(title, startTime, endTime, category, id);
  return getEvent(id);
}

export function deleteEvent(id: string): void {
  const stmt = db.prepare('DELETE FROM events WHERE id = ?');
  stmt.run(id);
}

function parseTime(timeStr: string): number {
  return new Date(timeStr).getTime();
}

function formatTime(ts: number): string {
  return new Date(ts).toISOString();
}

function mergeOverlapping(slots: { start: number; end: number }[]): { start: number; end: number }[] {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

function intersectSlots(slotsA: { start: number; end: number }[], slotsB: { start: number; end: number }[]): { start: number; end: number }[] {
  const result: { start: number; end: number }[] = [];
  let i = 0, j = 0;
  while (i < slotsA.length && j < slotsB.length) {
    const a = slotsA[i];
    const b = slotsB[j];
    const start = Math.max(a.start, b.start);
    const end = Math.min(a.end, b.end);
    if (start < end) {
      result.push({ start, end });
    }
    if (a.end < b.end) {
      i++;
    } else {
      j++;
    }
  }
  return result;
}

export function checkConflicts(teamId: string, rangeStart: string, rangeEnd: string, durationMinutes: number): ConflictResult {
  const members = getMembers(teamId);
  const allSlots = getTimeSlotsByTeam(teamId);

  const rangeStartTs = parseTime(rangeStart);
  const rangeEndTs = parseTime(rangeEnd);

  const memberSlots: Map<string, { start: number; end: number }[]> = new Map();
  for (const member of members) {
    memberSlots.set(member.id, []);
  }

  for (const slot of allSlots) {
    const start = parseTime(slot.start_time);
    const end = parseTime(slot.end_time);
    if (end < rangeStartTs || start > rangeEndTs) continue;
    const clippedStart = Math.max(start, rangeStartTs);
    const clippedEnd = Math.min(end, rangeEndTs);
    if (clippedStart < clippedEnd) {
      memberSlots.get(slot.member_id)?.push({ start: clippedStart, end: clippedEnd });
    }
  }

  const mergedMemberSlots: Map<string, { start: number; end: number }[]> = new Map();
  for (const [memberId, slots] of memberSlots) {
    mergedMemberSlots.set(memberId, mergeOverlapping(slots));
  }

  let commonAvailable: { start: number; end: number }[] = [];
  let first = true;
  for (const slots of mergedMemberSlots.values()) {
    if (first) {
      commonAvailable = [...slots];
      first = false;
    } else {
      commonAvailable = intersectSlots(commonAvailable, slots);
    }
  }

  const durationMs = durationMinutes * 60 * 1000;
  const availableSlots = commonAvailable
    .filter(s => s.end - s.start >= durationMs)
    .map(s => ({ start: formatTime(s.start), end: formatTime(s.end) }));

  const allTimePoints: number[] = new Set();
  for (const slots of mergedMemberSlots.values()) {
    for (const s of slots) {
      allTimePoints.add(s.start);
      allTimePoints.add(s.end);
    }
  }
  allTimePoints.add(rangeStartTs);
  allTimePoints.add(rangeEndTs);
  const sortedPoints = Array.from(allTimePoints).sort((a, b) => a - b);

  const partialConflicts: ConflictResult['partialConflicts'] = [];
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const segStart = sortedPoints[i];
    const segEnd = sortedPoints[i + 1];
    if (segStart >= rangeEndTs || segEnd <= rangeStartTs) continue;
    if (segEnd - segStart < durationMs) continue;

    const availableMembers: Member[] = [];
    const conflictMembers: { id: string; name: string; overlapMinutes: number }[] = [];

    for (const member of members) {
      const slots = mergedMemberSlots.get(member.id) || [];
      let isAvailable = false;
      for (const slot of slots) {
        if (slot.start <= segStart && slot.end >= segEnd) {
          isAvailable = true;
          break;
        }
      }
      if (isAvailable) {
        availableMembers.push(member);
      } else {
        let overlapMinutes = 0;
        for (const slot of slots) {
          const overlapStart = Math.max(slot.start, segStart);
          const overlapEnd = Math.min(slot.end, segEnd);
          if (overlapStart < overlapEnd) {
            overlapMinutes += (overlapEnd - overlapStart) / (1000 * 60);
          }
        }
        conflictMembers.push({ id: member.id, name: member.name, overlapMinutes: Math.round(overlapMinutes) });
      }
    }

    if (availableMembers.length > 0 && availableMembers.length < members.length) {
      partialConflicts.push({
        start: formatTime(segStart),
        end: formatTime(segEnd),
        availableCount: availableMembers.length,
        conflictMembers
      });
    }
  }

  return {
    availableSlots,
    partialConflicts,
    allMembers: members
  };
}
