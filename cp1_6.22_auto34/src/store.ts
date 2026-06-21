import { create } from 'zustand';
import type { Room, GameState, ChatMessage, Player, PlayerColor, Position, ToastMessage } from '@/types';
import { createEmptyBoard, INITIAL_TIME, checkWin, generateRoomId } from '@/types';

interface GameStore {
  nickname: string;
  setNickname: (name: string) => void;

  rooms: Room[];
  currentRoomId: string | null;

  gameStates: Record<string, GameState>;
  chatMessages: Record<string, ChatMessage[]>;

  toasts: ToastMessage[];
  addToast: (text: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;

  createRoom: (nickname: string) => string;
  getAvailableRooms: () => Room[];
  joinRoom: (roomId: string, nickname: string) => boolean;
  getRoom: (roomId: string) => Room | undefined;
  setCurrentRoom: (roomId: string | null) => void;

  makeMove: (roomId: string, position: Position, player: PlayerColor) => Position[] | null;
  setGameFinished: (roomId: string, winner: PlayerColor, winLine: Position[]) => void;
  setTimeoutLoss: (roomId: string, loser: PlayerColor) => void;

  addChatMessage: (roomId: string, message: ChatMessage) => void;
  getChatMessages: (roomId: string) => ChatMessage[];

  updatePlayerTime: (roomId: string, color: PlayerColor, delta: number) => void;

  resetRoom: (roomId: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  nickname: '',
  setNickname: (name) => set({ nickname: name }),

  rooms: [],
  currentRoomId: null,

  gameStates: {},
  chatMessages: {},

  toasts: [],
  addToast: (text, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { id, text, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  createRoom: (nickname) => {
    const roomId = generateRoomId();
    const newRoom: Room = {
      id: roomId,
      status: 'waiting',
      players: [{ nickname, color: 'black', remainingTime: INITIAL_TIME }],
      createdAt: Date.now(),
      creator: nickname,
    };
    const newGameState: GameState = {
      board: createEmptyBoard(),
      currentTurn: 'black',
      moves: [],
      winLine: null,
      winner: null,
      isFinished: false,
    };
    set((state) => ({
      rooms: [...state.rooms, newRoom],
      gameStates: { ...state.gameStates, [roomId]: newGameState },
      chatMessages: { ...state.chatMessages, [roomId]: [] },
    }));
    return roomId;
  },

  getAvailableRooms: () => get().rooms.filter((r) => r.status === 'waiting'),

  joinRoom: (roomId, nickname) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return false;
    if (room.status !== 'waiting') return false;
    if (room.players.length >= 2) return false;

    const updatedRoom: Room = {
      ...room,
      status: 'playing',
      players: [
        ...room.players,
        { nickname, color: 'white', remainingTime: INITIAL_TIME },
      ],
    };

    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? updatedRoom : r)),
    }));
    return true;
  },

  getRoom: (roomId) => get().rooms.find((r) => r.id === roomId),

  setCurrentRoom: (roomId) => set({ currentRoomId: roomId }),

  makeMove: (roomId, position, player) => {
    const gameState = get().gameStates[roomId];
    if (!gameState || gameState.isFinished) return null;
    if (gameState.currentTurn !== player) return null;
    if (gameState.board[position.row][position.col] !== null) return null;

    const newBoard = gameState.board.map((row) => [...row]);
    newBoard[position.row][position.col] = player;

    const winLine = checkWin(newBoard, position, player);

    const newMove = {
      order: gameState.moves.length + 1,
      position,
      player,
      timestamp: Date.now(),
    };

    const newGameState: GameState = {
      ...gameState,
      board: newBoard,
      currentTurn: player === 'black' ? 'white' : 'black',
      moves: [...gameState.moves, newMove],
      winLine,
      winner: winLine ? player : null,
      isFinished: winLine !== null,
    };

    set((state) => ({
      gameStates: { ...state.gameStates, [roomId]: newGameState },
    }));

    if (winLine) {
      const room = get().rooms.find((r) => r.id === roomId);
      if (room) {
        set((state) => ({
          rooms: state.rooms.map((r) =>
            r.id === roomId ? { ...r, status: 'finished' } : r
          ),
        }));
      }
    }

    return winLine;
  },

  setGameFinished: (roomId, winner, winLine) => {
    const gameState = get().gameStates[roomId];
    if (!gameState) return;
    set((state) => ({
      gameStates: {
        ...state.gameStates,
        [roomId]: { ...gameState, isFinished: true, winner, winLine },
      },
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, status: 'finished' } : r
      ),
    }));
  },

  setTimeoutLoss: (roomId, loser) => {
    const gameState = get().gameStates[roomId];
    if (!gameState || gameState.isFinished) return;
    const winner = loser === 'black' ? 'white' : 'black';
    set((state) => ({
      gameStates: {
        ...state.gameStates,
        [roomId]: { ...gameState, isFinished: true, winner, winLine: null },
      },
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, status: 'finished' } : r
      ),
    }));
  },

  addChatMessage: (roomId, message) => {
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [roomId]: [...(state.chatMessages[roomId] || []), message],
      },
    }));
  },

  getChatMessages: (roomId) => get().chatMessages[roomId] || [],

  updatePlayerTime: (roomId, color, delta) => {
    const room = get().rooms.find((r) => r.id === roomId);
    if (!room) return;
    const updatedPlayers = room.players.map((p) =>
      p.color === color ? { ...p, remainingTime: Math.max(0, p.remainingTime + delta) } : p
    );
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, players: updatedPlayers } : r
      ),
    }));
  },

  resetRoom: (roomId) => {
    set((state) => ({
      gameStates: {
        ...state.gameStates,
        [roomId]: {
          board: createEmptyBoard(),
          currentTurn: 'black',
          moves: [],
          winLine: null,
          winner: null,
          isFinished: false,
        },
      },
      chatMessages: { ...state.chatMessages, [roomId]: [] },
    }));
  },
}));
