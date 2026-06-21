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

export interface ConflictDetail {
  id: string;
  name: string;
  overlapMinutes: number;
}

export interface PartialConflict {
  start: string;
  end: string;
  availableCount: number;
  conflictMembers: ConflictDetail[];
}

export interface ConflictResult {
  availableSlots: { start: string; end: string }[];
  partialConflicts: PartialConflict[];
  allMembers: Member[];
}

function parseTime(timeStr: string): number {
  return new Date(timeStr).getTime();
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

function intersectSlots(
  slotsA: { start: number; end: number }[],
  slotsB: { start: number; end: number }[]
): { start: number; end: number }[] {
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

export function detectConflicts(
  members: Member[],
  slots: TimeSlot[],
  rangeStart: string,
  rangeEnd: string,
  durationMinutes: number
): ConflictResult {
  const rangeStartTs = parseTime(rangeStart);
  const rangeEndTs = parseTime(rangeEnd);
  const durationMs = durationMinutes * 60 * 1000;

  const memberSlots: Map<string, { start: number; end: number }[]> = new Map();
  for (const member of members) {
    memberSlots.set(member.id, []);
  }

  for (const slot of slots) {
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
  for (const [memberId, memSlots] of memberSlots) {
    mergedMemberSlots.set(memberId, mergeOverlapping(memSlots));
  }

  let commonAvailable: { start: number; end: number }[] = [];
  let first = true;
  for (const memSlots of mergedMemberSlots.values()) {
    if (first) {
      commonAvailable = [...memSlots];
      first = false;
    } else {
      commonAvailable = intersectSlots(commonAvailable, memSlots);
    }
  }

  const availableSlots = commonAvailable
    .filter((s) => s.end - s.start >= durationMs)
    .map((s) => ({
      start: new Date(s.start).toISOString(),
      end: new Date(s.end).toISOString(),
    }));

  const allTimePoints: Set<number> = new Set();
  for (const memSlots of mergedMemberSlots.values()) {
    for (const s of memSlots) {
      allTimePoints.add(s.start);
      allTimePoints.add(s.end);
    }
  }
  allTimePoints.add(rangeStartTs);
  allTimePoints.add(rangeEndTs);
  const sortedPoints = Array.from(allTimePoints).sort((a, b) => a - b);

  const partialConflicts: PartialConflict[] = [];
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const segStart = sortedPoints[i];
    const segEnd = sortedPoints[i + 1];
    if (segStart >= rangeEndTs || segEnd <= rangeStartTs) continue;
    if (segEnd - segStart < durationMs) continue;

    const availableMembers: Member[] = [];
    const conflictMembers: ConflictDetail[] = [];

    for (const member of members) {
      const memSlots = mergedMemberSlots.get(member.id) || [];
      let isAvailable = false;
      for (const slot of memSlots) {
        if (slot.start <= segStart && slot.end >= segEnd) {
          isAvailable = true;
          break;
        }
      }
      if (isAvailable) {
        availableMembers.push(member);
      } else {
        let overlapMinutes = 0;
        for (const slot of memSlots) {
          const overlapStart = Math.max(slot.start, segStart);
          const overlapEnd = Math.min(slot.end, segEnd);
          if (overlapStart < overlapEnd) {
            overlapMinutes += (overlapEnd - overlapStart) / (1000 * 60);
          }
        }
        conflictMembers.push({
          id: member.id,
          name: member.name,
          overlapMinutes: Math.round(overlapMinutes),
        });
      }
    }

    if (availableMembers.length > 0 && availableMembers.length < members.length) {
      partialConflicts.push({
        start: new Date(segStart).toISOString(),
        end: new Date(segEnd).toISOString(),
        availableCount: availableMembers.length,
        conflictMembers,
      });
    }
  }

  return {
    availableSlots,
    partialConflicts,
    allMembers: members,
  };
}

export function formatTimeLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  return addDays(start, 6);
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}
