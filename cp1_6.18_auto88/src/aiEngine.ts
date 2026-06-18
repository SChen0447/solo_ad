import { BOARD_SIZE, BoardState, StoneColor, AIRecommendation, idx, BLACK, WHITE } from './types';
import { tryPlaceStone, getGroup, getLibertyCount, opponent } from './boardLogic';

const POSITION_WEIGHT = [
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0, 0],
  [1, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 1, 0, 0],
  [1, 1, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 1, 1, 0, 0],
  [1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 3, 2, 1, 0],
  [1, 2, 3, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 3, 2, 1],
  [1, 2, 3, 4, 5, 6, 7, 7, 7, 7, 7, 7, 7, 6, 5, 4, 3, 2, 1],
  [1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8, 8, 8, 7, 6, 5, 4, 3, 2],
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 9, 9, 9, 8, 7, 6, 5, 4, 3],
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 9, 8, 7, 6, 5, 4, 3],
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  [1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9, 8, 8, 7, 6, 5, 4, 3, 2],
  [1, 2, 3, 4, 5, 6, 7, 7, 8, 8, 8, 8, 7, 7, 6, 5, 4, 3, 2],
  [1, 2, 3, 4, 5, 6, 7, 6, 7, 7, 7, 7, 7, 6, 5, 4, 3, 2, 1],
  [1, 2, 3, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 4, 3, 2, 1],
  [1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 3, 2, 1],
  [1, 1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 2, 1, 0],
  [0, 1, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 1, 0],
  [0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 0, 0],
];

function scorePositionValue(x: number, y: number): number {
  return POSITION_WEIGHT[y][x];
}

function scoreConnectivity(board: BoardState, x: number, y: number, color: StoneColor): number {
  let score = 0;
  const i = idx(x, y);
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      const ni = idx(nx, ny);
      if (board[ni] === color) {
        score += 15;
        const libs = getLibertyCount(board, ni);
        score += Math.min(libs, 5) * 3;
      }
    }
  }

  return score;
}

function scoreCapture(board: BoardState, x: number, y: number, color: StoneColor): number {
  let score = 0;
  const opp = opponent(color);
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      const ni = idx(nx, ny);
      if (board[ni] === opp) {
        const group = getGroup(board, ni);
        if (group.liberties.size <= 2) {
          score += (3 - group.liberties.size) * group.stones.length * 25;
        }
      }
    }
  }

  return score;
}

function scoreEyePotential(board: BoardState, x: number, y: number, color: StoneColor): number {
  let score = 0;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const diags = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  let friendlyAdj = 0;
  let emptyAdj = 0;
  let totalAdj = 0;

  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      totalAdj++;
      const ni = idx(nx, ny);
      if (board[ni] === color) friendlyAdj++;
      else if (board[ni] === 0) emptyAdj++;
    }
  }

  if (friendlyAdj >= 3 && emptyAdj >= 1) {
    score += 30;
  }

  let friendlyDiag = 0;
  let totalDiag = 0;
  for (const [dx, dy] of diags) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      totalDiag++;
      const ni = idx(nx, ny);
      if (board[ni] === color || board[ni] === 0) friendlyDiag++;
    }
  }

  if (friendlyAdj >= 2 && friendlyDiag >= totalDiag - 1) {
    score += 20;
  }

  return score;
}

function scoreInfluence(board: BoardState, x: number, y: number, color: StoneColor): number {
  let score = 0;
  const opp = opponent(color);
  const range = 3;

  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
        const dist = Math.abs(dx) + Math.abs(dy);
        const ni = idx(nx, ny);
        if (board[ni] === color) {
          score += (4 - dist) * 2;
        } else if (board[ni] === opp) {
          score += (4 - dist) * 1;
        }
      }
    }
  }

  return score;
}

function scoreSaveOwnGroup(board: BoardState, x: number, y: number, color: StoneColor): number {
  let score = 0;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
      const ni = idx(nx, ny);
      if (board[ni] === color) {
        const libs = getLibertyCount(board, ni);
        if (libs === 1) {
          const result = tryPlaceStone(board, x, y, color, null, null);
          if (result.legal) {
            const newGroupLibs = getLibertyCount(result.board, ni);
            if (newGroupLibs > 1) {
              score += 80;
            }
          }
        } else if (libs === 2) {
          score += 15;
        }
      }
    }
  }

  return score;
}

function scoreStarPointBonus(x: number, y: number, moveCount: number): number {
  if (moveCount > 20) return 0;
  const isStar = (x === 3 || x === 9 || x === 15) && (y === 3 || y === 9 || y === 15);
  if (isStar && moveCount < 6) return 20;
  return 0;
}

export function evaluateMove(
  board: BoardState,
  x: number,
  y: number,
  color: StoneColor,
  moveCount: number
): number {
  let score = 0;

  score += scorePositionValue(x, y) * 4;
  score += scoreConnectivity(board, x, y, color);
  score += scoreCapture(board, x, y, color);
  score += scoreEyePotential(board, x, y, color);
  score += scoreInfluence(board, x, y, color);
  score += scoreSaveOwnGroup(board, x, y, color);
  score += scoreStarPointBonus(x, y, moveCount);

  if (x === 0 || x === BOARD_SIZE - 1) score -= 10;
  if (y === 0 || y === BOARD_SIZE - 1) score -= 10;
  if ((x === 0 || x === BOARD_SIZE - 1) && (y === 0 || y === BOARD_SIZE - 1)) score -= 15;

  return Math.max(0, Math.min(1000, Math.round(score)));
}

export function getAIRecommendations(
  board: BoardState,
  color: StoneColor,
  koPoint: { x: number; y: number } | null,
  prevBoardStr: string | null,
  moveCount: number,
  topN: number = 3
): AIRecommendation[] {
  const candidates: AIRecommendation[] = [];

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const i = idx(x, y);
      if (board[i] !== 0) continue;

      const result = tryPlaceStone(board, x, y, color, koPoint, prevBoardStr);
      if (!result.legal) continue;

      const score = evaluateMove(board, x, y, color, moveCount);
      candidates.push({ x, y, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, topN);
}
