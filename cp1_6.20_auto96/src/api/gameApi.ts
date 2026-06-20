import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
}

export interface JoinResult {
  roomId: string;
  playerId: string;
  color: string;
  playerName: string;
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
});

export async function listRooms(): Promise<RoomInfo[]> {
  const resp = await api.get('/rooms');
  return resp.data;
}

export async function createRoom(name: string, playerName: string): Promise<JoinResult> {
  const resp = await api.post('/rooms', { name, playerName });
  return resp.data;
}

export async function joinRoom(roomId: string, playerName: string): Promise<JoinResult> {
  const resp = await api.post(`/rooms/${roomId}/join`, { playerName });
  return resp.data;
}

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: 10,
    });
  }
  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
