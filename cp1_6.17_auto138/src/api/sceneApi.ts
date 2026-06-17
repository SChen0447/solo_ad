import axios from 'axios';

export interface LightData {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  color: string;
  intensity: number;
  temperature: number;
  range?: number;
  castShadow: boolean;
  angle?: number;
  penumbra?: number;
  target?: { x: number; y: number; z: number };
  path?: { x: number; y: number; z: number }[];
}

export interface FurnitureData {
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
}

export interface RoomData {
  id: string;
  name: string;
  dimensions: { width: number; height: number; depth: number };
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  furniture: FurnitureData[];
  lights: LightData[];
}

export interface SceneData {
  id?: string;
  name: string;
  roomId: string;
  lights: Record<string, { color: string; intensity: number; temperature: number }>;
  thumbnail?: string;
  createdAt?: string;
}

export interface RoomListItem {
  id: string;
  name: string;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const sceneApi = {
  async getRooms(): Promise<RoomListItem[]> {
    const response = await api.get<RoomListItem[]>('/rooms');
    return response.data;
  },

  async getRoom(roomId: string): Promise<RoomData> {
    const response = await api.get<RoomData>(`/rooms/${roomId}`);
    return response.data;
  },

  async getScenes(): Promise<SceneData[]> {
    const response = await api.get<SceneData[]>('/scenes');
    return response.data;
  },

  async getScene(sceneId: string): Promise<SceneData> {
    const response = await api.get<SceneData>(`/scenes/${sceneId}`);
    return response.data;
  },

  async createScene(scene: SceneData): Promise<SceneData> {
    const response = await api.post<SceneData>('/scenes', scene);
    return response.data;
  },

  async updateScene(sceneId: string, scene: Partial<SceneData>): Promise<SceneData> {
    const response = await api.put<SceneData>(`/scenes/${sceneId}`, scene);
    return response.data;
  },

  async deleteScene(sceneId: string): Promise<void> {
    await api.delete(`/scenes/${sceneId}`);
  }
};

export default sceneApi;
