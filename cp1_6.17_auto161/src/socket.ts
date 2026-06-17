import { io, Socket } from 'socket.io-client';

export interface DrawStroke {
  type: 'start' | 'move' | 'end';
  x: number;
  y: number;
  color: string;
  width: number;
  timestamp: number;
}

export interface PlayerInfo {
  id: string;
  nickname: string;
  score: number;
  roundScore: number;
  isReady: boolean;
  isDrawer: boolean;
}

export interface GuessRecord {
  playerId: string;
  nickname: string;
  content: string;
  isCorrect: boolean;
  time: string;
}

export interface RoundResult {
  word: string;
  players: PlayerInfo[];
}

export interface RoomState {
  roomId: string;
  players: PlayerInfo[];
  currentDrawer: string;
  currentWord: string;
  roundNumber: number;
  totalRounds: number;
  difficulty: string;
  timeLeft: number;
  phase: 'waiting' | 'drawing' | 'roundEnd' | 'gameEnd';
}

type EventCallback = (...args: any[]) => void;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function createRoom(nickname: string): void {
  const s = getSocket();
  s.emit('create_room', { nickname });
}

export function joinRoom(roomId: string, nickname: string): void {
  const s = getSocket();
  s.emit('join_room', { roomId, nickname });
}

export function toggleReady(): void {
  const s = getSocket();
  s.emit('toggle_ready');
}

export function startGame(): void {
  const s = getSocket();
  s.emit('start_game');
}

export function sendDrawStroke(stroke: DrawStroke): void {
  const s = getSocket();
  s.emit('draw_stroke', stroke);
}

export function sendUndo(): void {
  const s = getSocket();
  s.emit('draw_undo');
}

export function submitGuess(content: string): void {
  const s = getSocket();
  s.emit('submit_guess', { content });
}

export function onRoomCreated(cb: (data: { roomId: string; playerId: string }) => void): () => void {
  const s = getSocket();
  s.on('room_created', cb);
  return () => s.off('room_created', cb);
}

export function onRoomJoined(cb: (data: { roomId: string; playerId: string; players: PlayerInfo[] }) => void): () => void {
  const s = getSocket();
  s.on('room_joined', cb);
  return () => s.off('room_joined', cb);
}

export function onPlayerUpdate(cb: (players: PlayerInfo[]) => void): () => void {
  const s = getSocket();
  s.on('player_update', cb);
  return () => s.off('player_update', cb);
}

export function onGameStart(cb: (data: RoomState) => void): () => void {
  const s = getSocket();
  s.on('game_start', cb);
  return () => s.off('game_start', cb);
}

export function onRoundStart(cb: (data: { roundNumber: number; drawer: string; word: string; timeLeft: number; difficulty: string }) => void): () => void {
  const s = getSocket();
  s.on('round_start', cb);
  return () => s.off('round_start', cb);
}

export function onDrawStroke(cb: (stroke: DrawStroke) => void): () => void {
  const s = getSocket();
  s.on('draw_stroke', cb);
  return () => s.off('draw_stroke', cb);
}

export function onDrawUndo(cb: () => void): () => void {
  const s = getSocket();
  s.on('draw_undo', cb);
  return () => s.off('draw_undo', cb);
}

export function onGuessResult(cb: (data: GuessRecord) => void): () => void {
  const s = getSocket();
  s.on('guess_result', cb);
  return () => s.off('guess_result', cb);
}

export function onTimerUpdate(cb: (timeLeft: number) => void): () => void {
  const s = getSocket();
  s.on('timer_update', cb);
  return () => s.off('timer_update', cb);
}

export function onRoundEnd(cb: (data: RoundResult) => void): () => void {
  const s = getSocket();
  s.on('round_end', cb);
  return () => s.off('round_end', cb);
}

export function onGameEnd(cb: (data: { players: PlayerInfo[] }) => void): () => void {
  const s = getSocket();
  s.on('game_end', cb);
  return () => s.off('game_end', cb);
}

export function onError(cb: (data: { message: string }) => void): () => void {
  const s = getSocket();
  s.on('error', cb);
  return () => s.off('error', cb);
}
