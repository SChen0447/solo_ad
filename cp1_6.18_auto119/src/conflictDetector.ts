import { v4 as uuidv4 } from 'uuid';
import type {
  Shape,
  AnimationTrack,
  Conflict,
  BoundingBox,
  ShapeState,
  ScheduleMode,
} from './types';
import { computeShapeStateAtTime, interpolate } from './animationEngine';

function getShapeBoundingBox(shape: Shape, state: ShapeState): BoundingBox {
  const cx = state.x + shape.width / 2;
  const cy = state.y + shape.height / 2;
  const w = shape.width * state.scale;
  const h = shape.height * state.scale;
  const rad = (state.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const newW = w * cos + h * sin;
  const newH = w * sin + h * cos;
  return {
    x: cx - newW / 2,
    y: cy - newH / 2,
    width: newW,
    height: newH,
  };
}

function boxIntersects(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

interface TemporalOverlap {
  trackIds: string[];
  shapeIds: string[];
  timeStart: number;
  timeEnd: number;
}

function detectTemporalOverlaps(tracks: AnimationTrack[]): TemporalOverlap[] {
  const active = tracks.filter((t) => t.isActive);
  if (active.length < 2) return [];

  const events: Array<{ time: number; type: 'start' | 'end'; track: AnimationTrack }> = [];
  for (const t of active) {
    events.push({ time: t.startTime, type: 'start', track: t });
    events.push({ time: t.startTime + t.duration, type: 'end', track: t });
  }
  events.sort((a, b) => a.time - b.time || (a.type === 'end' ? -1 : 1));

  const overlaps: TemporalOverlap[] = [];
  const activeSet = new Map<string, AnimationTrack>();
  let overlapStart: number | null = null;

  for (const ev of events) {
    if (ev.type === 'start') {
      if (activeSet.size >= 1 && overlapStart === null) {
        overlapStart = ev.time;
      }
      activeSet.set(ev.track.id, ev.track);
    } else {
      if (activeSet.size >= 2 && overlapStart !== null) {
        const endTime = ev.time;
        if (endTime > overlapStart) {
          const trackIds = Array.from(activeSet.keys());
          const shapeIds = Array.from(new Set(trackIds.map((id) => activeSet.get(id)!.shapeId)));
          if (shapeIds.length >= 1) {
            overlaps.push({ trackIds, shapeIds, timeStart: overlapStart, timeEnd: endTime });
          }
        }
        overlapStart = null;
      }
      activeSet.delete(ev.track.id);
      if (activeSet.size >= 2 && overlapStart === null) {
        overlapStart = ev.time;
      }
    }
  }

  return overlaps;
}

export function detectConflicts(
  shapes: Shape[],
  tracks: AnimationTrack[],
  _totalDuration: number
): Conflict[] {
  const conflicts: Conflict[] = [];
  const temporalOverlaps = detectTemporalOverlaps(tracks);
  const addedPairs = new Set<string>();

  for (const overlap of temporalOverlaps) {
    const sameShape = overlap.shapeIds.length === 1;
    const key = `${overlap.shapeIds.sort().join('-')}-${overlap.timeStart.toFixed(2)}-${overlap.timeEnd.toFixed(2)}`;

    if (sameShape) {
      if (!addedPairs.has(key)) {
        addedPairs.add(key);
        conflicts.push({
          id: uuidv4(),
          shapeIds: overlap.shapeIds,
          type: 'temporal',
          timeStart: overlap.timeStart,
          timeEnd: overlap.timeEnd,
          trackIds: overlap.trackIds,
          suggestion: '建议调整时间错开或改变动画路径',
        });
      }
    } else {
      let hasSpatial = false;
      const sampleCount = 5;
      for (let i = 0; i <= sampleCount; i++) {
        const t = overlap.timeStart + ((overlap.timeEnd - overlap.timeStart) * i) / sampleCount;
        const states = new Map<string, ShapeState>();
        for (const s of shapes) {
          states.set(s.id, computeShapeStateAtTime(s, tracks, t));
        }
        for (let a = 0; a < overlap.shapeIds.length; a++) {
          for (let b = a + 1; b < overlap.shapeIds.length; b++) {
            const sa = shapes.find((s) => s.id === overlap.shapeIds[a]);
            const sb = shapes.find((s) => s.id === overlap.shapeIds[b]);
            if (!sa || !sb) continue;
            const ba = getShapeBoundingBox(sa, states.get(sa.id)!);
            const bb = getShapeBoundingBox(sb, states.get(sb.id)!);
            if (boxIntersects(ba, bb)) {
              hasSpatial = true;
              break;
            }
          }
          if (hasSpatial) break;
        }
        if (hasSpatial) break;
      }

      const conflictType = hasSpatial ? 'both' : 'temporal';
      if (!addedPairs.has(key + conflictType)) {
        addedPairs.add(key + conflictType);
        conflicts.push({
          id: uuidv4(),
          shapeIds: overlap.shapeIds,
          type: conflictType,
          timeStart: overlap.timeStart,
          timeEnd: overlap.timeEnd,
          trackIds: overlap.trackIds,
          suggestion: hasSpatial
            ? '空间重叠：建议调错时间或改变路径'
            : '时间重叠：建议调整开始时间错开',
        });
      }
    }
  }

  return conflicts;
}

export function applyScheduleMode(
  mode: ScheduleMode,
  tracks: AnimationTrack[],
  conflicts: Conflict[]
): AnimationTrack[] {
  if (mode === 'none') return tracks.map((t) => ({ ...t, isActive: true }));

  const newTracks = tracks.map((t) => ({ ...t, isActive: true }));
  const minGap = 0.5;

  if (mode === 'stagger') {
    for (const conflict of conflicts) {
      const conflictingTracks = newTracks
        .filter((t) => conflict.trackIds.includes(t.id))
        .sort((a, b) => a.priority - b.priority || a.startTime - b.startTime);

      for (let i = 1; i < conflictingTracks.length; i++) {
        const prev = conflictingTracks[i - 1];
        const curr = conflictingTracks[i];
        const prevEnd = prev.startTime + prev.duration;
        if (curr.startTime < prevEnd + minGap) {
          const delta = prevEnd + minGap - curr.startTime;
          const idx = newTracks.findIndex((t) => t.id === curr.id);
          if (idx !== -1) {
            newTracks[idx] = { ...newTracks[idx], startTime: newTracks[idx].startTime + delta };
            conflictingTracks[i] = newTracks[idx];
          }
        }
      }
    }
  } else if (mode === 'degrade') {
    for (const conflict of conflicts) {
      const conflictingTracks = newTracks
        .filter((t) => conflict.trackIds.includes(t.id) && t.isActive)
        .sort((a, b) => b.priority - a.priority);

      for (let i = 1; i < conflictingTracks.length; i++) {
        const idx = newTracks.findIndex((t) => t.id === conflictingTracks[i].id);
        if (idx !== -1) {
          newTracks[idx] = { ...newTracks[idx], isActive: false };
        }
      }
    }
  }

  return newTracks;
}

export { interpolate };
