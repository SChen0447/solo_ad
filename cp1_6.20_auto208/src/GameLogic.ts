import { CellState, DifficultyMode, GameState, Line, Player, PlayerState, DIFFICULTY_CONFIGS } from './types';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createInitialBoard(size: number, minPlanets: number, maxPlanets: number): CellState[][] {
  const board: CellState[][] = [];
  for (let r = 0; r < size; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < size; c++) {
      row.push({ owner: null, isPlanet: false });
    }
    board.push(row);
  }

  const planetCount = randInt(minPlanets, maxPlanets);
  const used = new Set<string>();
  let placed = 0;
  while (placed < planetCount) {
    const r = randInt(0, size - 1);
    const c = randInt(0, size - 1);
    const key = `${r}-${c}`;
    if (!used.has(key)) {
      used.add(key);
      board[r][c].isPlanet = true;
      placed++;
    }
  }

  return board;
}

export function initGameState(difficulty: DifficultyMode): GameState {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const board = createInitialBoard(config.boardSize, config.minPlanets, config.maxPlanets);

  return {
    board,
    boardSize: config.boardSize,
    players: [
      { id: 1, score: 0, tokensPlaced: 0, energy: 0, skillUsedCount: 0 },
      { id: 2, score: 0, tokensPlaced: 0, energy: 0, skillUsedCount: 0 },
    ],
    currentPlayer: 1,
    phase: 'playing',
    difficulty,
    targetScore: config.targetScore,
    hasSkill: config.hasSkill,
    totalTurns: 0,
    longestLine: 0,
    activeLines: [],
    scoreHistory: [{ turn: 0, player1: 0, player2: 0 }],
    skillMode: false,
    winner: null,
    lastError: null,
  };
}

export function detectLines(board: CellState[][], size: number): Line[] {
  const lines: Line[] = [];
  const directions: { dr: number; dc: number; name: Line['direction'] }[] = [
    { dr: 0, dc: 1, name: 'horizontal' },
    { dr: 1, dc: 0, name: 'vertical' },
    { dr: 1, dc: 1, name: 'diagonal-right' },
    { dr: 1, dc: -1, name: 'diagonal-left' },
  ];

  const visited = new Set<string>();

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const owner = board[r][c].owner;
      if (owner === null) continue;

      for (const { dr, dc, name } of directions) {
        const cells: [number, number][] = [[r, c]];
        let nr = r + dr;
        let nc = c + dc;

        while (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc].owner === owner) {
          cells.push([nr, nc]);
          nr += dr;
          nc += dc;
        }

        if (cells.length >= 3) {
          const key = cells.map(([cr, cc]) => `${cr}-${cc}`).join('|') + '|' + name;
          const startCell = cells[0];
          const endCell = cells[cells.length - 1];
          const reverseKey = cells.slice().reverse().map(([cr, cc]) => `${cr}-${cc}`).join('|') + '|' + name;

          const isSubLine = [...visited].some(vk => {
            if (vk === key || vk === reverseKey) return true;
            const vkParts = vk.split('|').filter(p => p.includes('-'));
            if (vkParts.length > cells.length) {
              return vkParts.every(p => key.includes(p));
            }
            return false;
          });

          if (!isSubLine) {
            visited.add(key);
            visited.add(reverseKey);
            lines.push({
              player: owner,
              cells,
              direction: name,
              length: cells.length,
            });
          }
        }
      }
    }
  }

  const filtered: Line[] = [];
  for (const line of lines) {
    const lineKey = line.cells.map(([cr, cc]) => `${cr}-${cc}`).join('|') + '|' + line.direction;
    let isSubsumed = false;
    for (const other of filtered) {
      if (other.player !== line.player || other.direction !== line.direction) continue;
      if (other.length > line.length) {
        const allContained = line.cells.every(([lr, lc]) =>
          other.cells.some(([or2, oc]) => or2 === lr && oc === lc)
        );
        if (allContained) {
          isSubsumed = true;
          break;
        }
      }
    }
    if (!isSubsumed) {
      filtered.push(line);
    }
  }

  return filtered;
}

export function calculateScore(state: GameState): { scores: [number, number]; lines: Line[] } {
  const lines = detectLines(state.board, state.boardSize);
  const scores: [number, number] = [0, 0];

  for (let r = 0; r < state.boardSize; r++) {
    for (let c = 0; c < state.boardSize; c++) {
      const cell = state.board[r][c];
      if (cell.owner !== null) {
        scores[cell.owner - 1] += cell.isPlanet ? 2 : 1;
      }
    }
  }

  for (const line of lines) {
    scores[line.player - 1] += line.length;
  }

  return { scores, lines };
}

export function calculateEndGameBonus(lines: Line[]): [number, number] {
  const bonus: [number, number] = [0, 0];
  for (const line of lines) {
    if (line.length >= 4) {
      bonus[line.player - 1] += line.length - 3;
    }
  }
  return bonus;
}

export function placeToken(state: GameState, row: number, col: number): GameState {
  if (state.phase !== 'playing') return { ...state, lastError: '游戏已结束' };
  if (row < 0 || row >= state.boardSize || col < 0 || col >= state.boardSize) {
    return { ...state, lastError: '无效位置' };
  }
  if (state.board[row][col].owner !== null) {
    return { ...state, lastError: '该位置已有代币' };
  }

  const newBoard = state.board.map(r => r.map(c => ({ ...c })));
  newBoard[row][col].owner = state.currentPlayer;

  const newPlayers: [PlayerState, PlayerState] = [
    { ...state.players[0] },
    { ...state.players[1] },
  ];
  const currentIdx = state.currentPlayer - 1;
  newPlayers[currentIdx].tokensPlaced += 1;
  newPlayers[currentIdx].energy = newPlayers[currentIdx].tokensPlaced % 5 === 0
    ? Math.min(newPlayers[currentIdx].energy + 1, 6)
    : newPlayers[currentIdx].energy;
  if (newPlayers[currentIdx].tokensPlaced > 0 && newPlayers[currentIdx].tokensPlaced % 5 === 0) {
    newPlayers[currentIdx].energy = Math.min(Math.floor(newPlayers[currentIdx].tokensPlaced / 5), 6);
  }

  const tempState: GameState = {
    ...state,
    board: newBoard,
    players: newPlayers,
    totalTurns: state.totalTurns + 1,
    skillMode: false,
    lastError: null,
  };

  const { scores, lines } = calculateScore(tempState);
  tempState.players[0].score = scores[0];
  tempState.players[1].score = scores[1];
  tempState.activeLines = lines;

  const maxLineLen = lines.reduce((max, l) => Math.max(max, l.length), 0);
  tempState.longestLine = Math.max(tempState.longestLine, maxLineLen);

  const winner = checkWin(tempState);
  if (winner) {
    const bonus = calculateEndGameBonus(lines);
    tempState.players[0].score += bonus[0];
    tempState.players[1].score += bonus[1];
    tempState.phase = 'ended';
    tempState.winner = winner;
  } else {
    tempState.currentPlayer = (state.currentPlayer === 1 ? 2 : 1) as Player;
  }

  tempState.scoreHistory = [
    ...state.scoreHistory,
    {
      turn: tempState.totalTurns,
      player1: tempState.players[0].score,
      player2: tempState.players[1].score,
    },
  ];

  return tempState;
}

export function useSkill(state: GameState, row: number, col: number): GameState {
  if (state.phase !== 'playing') return { ...state, lastError: '游戏已结束' };
  if (!state.hasSkill) return { ...state, lastError: '当前模式无技能' };
  if (!state.skillMode) return { ...state, lastError: '请先激活技能模式' };

  const currentIdx = state.currentPlayer - 1;
  const currentEnergy = Math.floor(state.players[currentIdx].tokensPlaced / 5);
  if (currentEnergy < 1) {
    return { ...state, lastError: '能量不足' };
  }

  if (row < 0 || row >= state.boardSize || col < 0 || col >= state.boardSize) {
    return { ...state, lastError: '无效位置' };
  }
  const opponent: Player = state.currentPlayer === 1 ? 2 : 1;
  if (state.board[row][col].owner !== opponent) {
    return { ...state, lastError: '只能替换对方代币' };
  }

  const newBoard = state.board.map(r => r.map(c => ({ ...c })));
  newBoard[row][col].owner = state.currentPlayer;

  const newPlayers: [PlayerState, PlayerState] = [
    { ...state.players[0] },
    { ...state.players[1] },
  ];
  newPlayers[currentIdx].tokensPlaced += 1;
  newPlayers[currentIdx].skillUsedCount += 1;

  const tempState: GameState = {
    ...state,
    board: newBoard,
    players: newPlayers,
    totalTurns: state.totalTurns + 1,
    skillMode: false,
    lastError: null,
  };

  const { scores, lines } = calculateScore(tempState);
  tempState.players[0].score = scores[0];
  tempState.players[1].score = scores[1];
  tempState.activeLines = lines;

  const maxLineLen = lines.reduce((max, l) => Math.max(max, l.length), 0);
  tempState.longestLine = Math.max(tempState.longestLine, maxLineLen);

  const winner = checkWin(tempState);
  if (winner) {
    const bonus = calculateEndGameBonus(lines);
    tempState.players[0].score += bonus[0];
    tempState.players[1].score += bonus[1];
    tempState.phase = 'ended';
    tempState.winner = winner;
  } else {
    tempState.currentPlayer = (state.currentPlayer === 1 ? 2 : 1) as Player;
  }

  tempState.scoreHistory = [
    ...state.scoreHistory,
    {
      turn: tempState.totalTurns,
      player1: tempState.players[0].score,
      player2: tempState.players[1].score,
    },
  ];

  return tempState;
}

export function checkWin(state: GameState): Player | null {
  if (state.players[0].score >= state.targetScore) return 1;
  if (state.players[1].score >= state.targetScore) return 2;
  return null;
}

export function isBoardFull(state: GameState): boolean {
  for (let r = 0; r < state.boardSize; r++) {
    for (let c = 0; c < state.boardSize; c++) {
      if (state.board[r][c].owner === null) return false;
    }
  }
  return true;
}

export function getPlayerEnergy(tokensPlaced: number): number {
  return Math.floor(tokensPlaced / 5);
}

export function canUseSkill(state: GameState): boolean {
  if (!state.hasSkill) return false;
  const energy = getPlayerEnergy(state.players[state.currentPlayer - 1].tokensPlaced);
  const used = state.players[state.currentPlayer - 1].skillUsedCount;
  return energy > used;
}
