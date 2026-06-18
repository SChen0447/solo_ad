export interface Message {
  id: string;
  sceneId: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
  edited?: boolean;
}

export interface Role {
  id: string;
  sceneId: string;
  name: string;
  description: string;
  personality: string;
  appearance: string;
  avatarColor?: string;
}

export interface Scene {
  id: string;
  name: string;
  worldBackground: string;
  createdAt: number;
  updatedAt: number;
}

export interface SceneExport {
  scene: Scene;
  roles: Role[];
  messages: Message[];
  version: string;
}
