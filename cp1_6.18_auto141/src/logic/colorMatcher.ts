import { ColorName } from '../data/colorEmotionMap';
import { Mechanism, LabyrinthCell } from './labyrinthGenerator';

export interface MatchResult {
  success: boolean;
  progress: number;
  totalRequired: number;
  completed: boolean;
}

export function checkMechanismProgress(
  mechanism: Mechanism,
  visitedColors: ColorName[]
): MatchResult {
  const required = mechanism.requirement.colors;
  const progress = getMatchingProgress(required, visitedColors);

  return {
    success: progress > 0,
    progress,
    totalRequired: required.length,
    completed: progress === required.length,
  };
}

function getMatchingProgress(required: ColorName[], visited: ColorName[]): number {
  let matchCount = 0;
  for (let i = 0; i < required.length; i++) {
    if (i < visited.length && visited[i] === required[i]) {
      matchCount++;
    } else {
      break;
    }
  }
  return matchCount;
}

export function tryUnlockMechanism(
  mechanism: Mechanism,
  currentSequence: ColorName[]
): { unlocked: boolean; correct: boolean; progress: number } {
  const required = mechanism.requirement.colors;
  const progress = getMatchingProgress(required, currentSequence);

  if (progress === required.length) {
    return { unlocked: true, correct: true, progress };
  }

  if (currentSequence.length <= required.length) {
    const lastIdx = currentSequence.length - 1;
    if (lastIdx >= 0 && currentSequence[lastIdx] === required[lastIdx]) {
      return { unlocked: false, correct: true, progress };
    }
  }

  return { unlocked: false, correct: false, progress: 0 };
}

export function canMoveTo(
  from: LabyrinthCell,
  toRow: number,
  toCol: number,
  cellGrid: LabyrinthCell[][],
  mechanisms: Mechanism[]
): boolean {
  const size = cellGrid.length;
  if (toRow < 0 || toRow >= size || toCol < 0 || toCol >= size) return false;

  const dr = toRow - from.row;
  const dc = toCol - from.col;

  if (dr === -1 && from.walls.top) {
    return isWallOpenedByMechanism(from.row, from.col, 'top', mechanisms, cellGrid);
  }
  if (dr === 1 && from.walls.bottom) {
    return isWallOpenedByMechanism(from.row, from.col, 'bottom', mechanisms, cellGrid);
  }
  if (dc === -1 && from.walls.left) {
    return isWallOpenedByMechanism(from.row, from.col, 'left', mechanisms, cellGrid);
  }
  if (dc === 1 && from.walls.right) {
    return isWallOpenedByMechanism(from.row, from.col, 'right', mechanisms, cellGrid);
  }

  return true;
}

function isWallOpenedByMechanism(
  row: number,
  col: number,
  side: 'top' | 'right' | 'bottom' | 'left',
  mechanisms: Mechanism[],
  _cellGrid: LabyrinthCell[][]
): boolean {
  for (const mech of mechanisms) {
    if (
      mech.unlocked &&
      mech.wallToRemove.row === row &&
      mech.wallToRemove.col === col &&
      mech.wallToRemove.side === side
    ) {
      return true;
    }
  }
  return false;
}
