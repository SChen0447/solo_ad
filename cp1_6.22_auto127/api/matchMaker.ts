import { v4 as uuidv4 } from 'uuid';
import type { QueueEntry, MatchFoundPayload } from '../../shared/types';
import { MATCH_POWER_TOLERANCE } from '../../shared/types';

const queue = new Map<string, QueueEntry>();

export function addToQueue(entry: QueueEntry): void {
  queue.set(entry.playerId, entry);
}

export function removeFromQueue(playerId: string): void {
  queue.delete(playerId);
}

export function getQueueSize(): number {
  return queue.size;
}

export function tryMatch(playerId: string): MatchFoundPayload | null {
  const entry = queue.get(playerId);
  if (!entry) return null;

  const minPower = entry.power * (1 - MATCH_POWER_TOLERANCE);
  const maxPower = entry.power * (1 + MATCH_POWER_TOLERANCE);

  let bestMatch: QueueEntry | null = null;
  let bestDiff = Infinity;

  for (const [pid, candidate] of queue) {
    if (pid === playerId) continue;
    if (candidate.power < minPower || candidate.power > maxPower) continue;
    const diff = Math.abs(candidate.power - entry.power);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMatch = candidate;
    }
  }

  if (bestMatch) {
    queue.delete(playerId);
    queue.delete(bestMatch.playerId);
    return {
      roomId: uuidv4(),
      opponent: {
        playerId: bestMatch.playerId,
        ships: bestMatch.ships,
        power: bestMatch.power,
      },
    };
  }

  return null;
}

export function clearQueue(): void {
  queue.clear();
}
