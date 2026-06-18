import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  PieceType,
  PieceData,
  ConnectionData,
  Inventory,
  BoardState,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  MAX_CONNECTIONS_PER_PIECE,
  INITIAL_PIECE_COUNT,
} from './types';

const createInitialInventory = (): Inventory => ({
  fire: INITIAL_PIECE_COUNT,
  water: INITIAL_PIECE_COUNT,
  wind: INITIAL_PIECE_COUNT,
  earth: INITIAL_PIECE_COUNT,
  light: INITIAL_PIECE_COUNT,
  dark: INITIAL_PIECE_COUNT,
});

const getManhattanDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
};

const getChebyshevDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
};

const canConnect = (
  source: PieceData,
  target: PieceData,
  allPieces: PieceData[],
  existingConnections: ConnectionData[]
): boolean => {
  if (source.id === target.id) return false;

  const alreadyConnected = existingConnections.some(
    (c) =>
      (c.fromId === source.id && c.toId === target.id) ||
      (c.fromId === target.id && c.toId === source.id)
  );
  if (alreadyConnected) return false;

  const dx = Math.abs(source.x - target.x);
  const dy = Math.abs(source.y - target.y);
  const manhattan = getManhattanDistance(source.x, source.y, target.x, target.y);
  const chebyshev = getChebyshevDistance(source.x, source.y, target.x, target.y);

  switch (source.type) {
    case 'fire':
      if (manhattan > 2) return false;
      return target.type === 'fire' || target.type === 'wind';
    case 'water':
      if (source.x !== target.x && source.y !== target.y) return false;
      return target.type === 'water' || target.type === 'earth';
    case 'wind':
      if (dx === 0 || dy === 0) return false;
      if (chebyshev > 2) return false;
      return target.type === 'wind' || target.type === 'fire';
    case 'earth':
      if (manhattan !== 1) return false;
      return target.type === 'earth' || target.type === 'water';
    case 'light':
      if (manhattan > 3) return false;
      const lightPieces = allPieces.filter((p) => p.type === 'light');
      for (const lp of lightPieces) {
        const hasLightConnection = existingConnections.some(
          (c) =>
            (c.fromId === lp.id || c.toId === lp.id) &&
            (allPieces.find((p) => p.id === c.fromId)?.type === 'light' ||
              allPieces.find((p) => p.id === c.toId)?.type === 'light')
        );
        if (hasLightConnection && (lp.id === source.id || lp.id === target.id)) {
          return false;
        }
      }
      return true;
    case 'dark':
      return false;
    default:
      return false;
  }
};

const calculateConnectionScore = (fromType: PieceType, toType: PieceType): number => {
  let base = 10;

  const types = new Set([fromType, toType]);
  if (types.has('fire') && types.has('water')) {
    base += 15;
  }
  if (types.has('light') && types.has('dark')) {
    base += 30;
  }

  if (fromType === 'dark' || toType === 'dark') {
    base *= 2;
  }

  return base;
};

interface Store extends BoardState {
  placePiece: (type: PieceType, x: number, y: number) => void;
  removePiece: (pieceId: string) => void;
  movePiece: (pieceId: string, x: number, y: number) => void;
  resetBoard: () => void;
  clearScoreAnimation: () => void;
}

const findConnectionsForPiece = (
  piece: PieceData,
  allPieces: PieceData[],
  existingConnections: ConnectionData[]
): ConnectionData[] => {
  const newConnections: ConnectionData[] = [];
  for (const other of allPieces) {
    if (canConnect(piece, other, allPieces, [...existingConnections, ...newConnections])) {
      newConnections.push({
        id: uuidv4(),
        fromId: piece.id,
        toId: other.id,
        score: calculateConnectionScore(piece.type, other.type),
        isNew: true,
      });
    }
    if (canConnect(other, piece, allPieces, [...existingConnections, ...newConnections])) {
      newConnections.push({
        id: uuidv4(),
        fromId: other.id,
        toId: piece.id,
        score: calculateConnectionScore(other.type, piece.type),
        isNew: true,
      });
    }
  }
  return newConnections;
};

const enforceMaxConnections = (
  connections: ConnectionData[],
  pieces: PieceData[]
): ConnectionData[] => {
  const pieceConnections: Record<string, ConnectionData[]> = {};
  for (const p of pieces) {
    pieceConnections[p.id] = [];
  }
  for (const c of connections) {
    if (pieceConnections[c.fromId]) pieceConnections[c.fromId].push(c);
    if (pieceConnections[c.toId]) pieceConnections[c.toId].push(c);
  }

  const toRemove = new Set<string>();
  for (const pieceId of Object.keys(pieceConnections)) {
    const conns = pieceConnections[pieceId];
    if (conns.length > MAX_CONNECTIONS_PER_PIECE) {
      const sorted = [...conns].sort((a, b) => a.score - b.score);
      const excess = sorted.length - MAX_CONNECTIONS_PER_PIECE;
      for (let i = 0; i < excess; i++) {
        toRemove.add(sorted[i].id);
      }
    }
  }

  return connections.filter((c) => !toRemove.has(c.id));
};

const recalculateAllConnections = (pieces: PieceData[]): ConnectionData[] => {
  let connections: ConnectionData[] = [];

  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i];
      const b = pieces[j];
      if (canConnect(a, b, pieces, connections)) {
        connections.push({
          id: uuidv4(),
          fromId: a.id,
          toId: b.id,
          score: calculateConnectionScore(a.type, b.type),
        });
      } else if (canConnect(b, a, pieces, connections)) {
        connections.push({
          id: uuidv4(),
          fromId: b.id,
          toId: a.id,
          score: calculateConnectionScore(b.type, a.type),
        });
      }
    }
  }

  return enforceMaxConnections(connections, pieces);
};

const calculateTotalScore = (connections: ConnectionData[], pieces: PieceData[]): number => {
  let total = connections.reduce((sum, c) => sum + c.score, 0);

  if (pieces.length > 0) {
    const connectedPieceIds = new Set<string>();
    for (const c of connections) {
      connectedPieceIds.add(c.fromId);
      connectedPieceIds.add(c.toId);
    }
    if (connectedPieceIds.size === pieces.length) {
      total += 50;
    }
  }

  return total;
};

export const useStore = create<Store>((set, get) => ({
  pieces: [],
  connections: [],
  inventory: createInitialInventory(),
  score: 0,
  scoreAnimation: null,

  placePiece: (type: PieceType, x: number, y: number) => {
    const state = get();
    if (state.inventory[type] <= 0) return;
    if (state.pieces.some((p) => p.x === x && p.y === y)) return;
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) return;

    const newPiece: PieceData = {
      id: uuidv4(),
      type,
      x,
      y,
      isNew: true,
    };

    const updatedPieces = [...state.pieces, newPiece];
    let updatedConnections = [...state.connections];
    const newConnections = findConnectionsForPiece(newPiece, updatedPieces, updatedConnections);
    updatedConnections = [...updatedConnections, ...newConnections];
    updatedConnections = enforceMaxConnections(updatedConnections, updatedPieces);

    const newScore = calculateTotalScore(updatedConnections, updatedPieces);
    const scoreDiff = newScore - state.score;

    set({
      pieces: updatedPieces,
      connections: updatedConnections,
      inventory: {
        ...state.inventory,
        [type]: state.inventory[type] - 1,
      },
      score: newScore,
      scoreAnimation: scoreDiff !== 0 ? { value: scoreDiff, key: Date.now() } : null,
    });
  },

  removePiece: (pieceId: string) => {
    const state = get();
    const piece = state.pieces.find((p) => p.id === pieceId);
    if (!piece) return;

    const updatedPieces = state.pieces.filter((p) => p.id !== pieceId);
    const updatedConnections = recalculateAllConnections(updatedPieces);
    const newScore = calculateTotalScore(updatedConnections, updatedPieces);
    const scoreDiff = newScore - state.score;

    set({
      pieces: updatedPieces,
      connections: updatedConnections,
      inventory: {
        ...state.inventory,
        [piece.type]: state.inventory[piece.type] + 1,
      },
      score: newScore,
      scoreAnimation: scoreDiff !== 0 ? { value: scoreDiff, key: Date.now() } : null,
    });
  },

  movePiece: (pieceId: string, x: number, y: number) => {
    const state = get();
    const piece = state.pieces.find((p) => p.id === pieceId);
    if (!piece) return;
    if (state.pieces.some((p) => p.id !== pieceId && p.x === x && p.y === y)) return;
    if (x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT) return;

    if (piece.x === x && piece.y === y) return;

    const updatedPieces = state.pieces.map((p) =>
      p.id === pieceId ? { ...p, x, y } : p
    );
    const updatedConnections = recalculateAllConnections(updatedPieces);
    const newScore = calculateTotalScore(updatedConnections, updatedPieces);
    const scoreDiff = newScore - state.score;

    set({
      pieces: updatedPieces,
      connections: updatedConnections,
      score: newScore,
      scoreAnimation: scoreDiff !== 0 ? { value: scoreDiff, key: Date.now() } : null,
    });
  },

  resetBoard: () => {
    set({
      pieces: [],
      connections: [],
      inventory: createInitialInventory(),
      score: 0,
      scoreAnimation: null,
    });
  },

  clearScoreAnimation: () => {
    set({ scoreAnimation: null });
  },
}));
