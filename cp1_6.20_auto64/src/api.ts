import axios from 'axios';
import type { MapData, Room, TowerConfig, MinionType, PlayerSide, ChatMessage } from './types';

const API_BASE = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 5000
});

export const saveMap = async (mapData: Omit<MapData, 'id' | 'createdAt'>): Promise<{ id: string }> => {
  const response = await api.post('/map', mapData);
  return response.data;
};

export const loadMap = async (mapId: string): Promise<MapData> => {
  const response = await api.get(`/map/${mapId}`);
  return response.data;
};

export const getMaps = async (): Promise<MapData[]> => {
  const response = await api.get('/maps');
  return response.data;
};

export const createMatch = async (
  playerId: string,
  mapId: string,
  side: 'defender' | 'attacker' | 'any'
): Promise<{ roomId: string }> => {
  const response = await api.post('/match', { playerId, mapId, side });
  return response.data;
};

export const getRooms = async (): Promise<Room[]> => {
  const response = await api.get('/rooms');
  return response.data;
};

export const joinRoom = async (
  roomId: string,
  playerId: string,
  side: PlayerSide
): Promise<{ success: boolean }> => {
  const response = await api.post(`/room/${roomId}/join`, { playerId, side });
  return response.data;
};

export const leaveRoom = async (roomId: string, playerId: string): Promise<{ success: boolean }> => {
  const response = await api.post(`/room/${roomId}/leave`, { playerId });
  return response.data;
};

export const placeTower = (socket: any, roomId: string, tower: TowerConfig): void => {
  socket.emit('place_tower', { roomId, tower });
};

export const upgradeTower = (socket: any, roomId: string, towerId: string): void => {
  socket.emit('upgrade_tower', { roomId, towerId });
};

export const spawnMinion = (socket: any, roomId: string, minionType: MinionType): void => {
  socket.emit('spawn_minion', { roomId, minionType });
};

export const sendChatMessage = (socket: any, message: ChatMessage): void => {
  socket.emit('chat_message', message);
};

export const joinRoomSocket = (socket: any, roomId: string, playerId: string, side: PlayerSide): void => {
  socket.emit('join_room', { roomId, playerId, side });
};

export const leaveRoomSocket = (socket: any, roomId: string, playerId: string): void => {
  socket.emit('leave_room', { roomId, playerId });
};
