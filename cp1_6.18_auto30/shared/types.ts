export interface StoryNode {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  createdAt: number;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: 'default' | 'conditional';
  label?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface StoryState {
  nodes: StoryNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  editingNodeId: string | null;
  onlineUsers: User[];
  currentUserId: string;
  previewNodeId: string | null;
  isPreviewMode: boolean;
  editingByOther: Record<string, string>;
}

export interface ServerToClientEvents {
  'user-joined': (data: { user: User; users: User[] }) => void;
  'user-left': (data: { userId: string; users: User[] }) => void;
  'node-add': (data: { node: StoryNode }) => void;
  'node-update': (data: { node: StoryNode }) => void;
  'node-delete': (data: { nodeId: string }) => void;
  'node-drag': (data: { nodeId: string; x: number; y: number; userId: string }) => void;
  'connection-add': (data: { connection: Connection }) => void;
  'connection-delete': (data: { connectionId: string }) => void;
  'node-editing': (data: { nodeId: string; userId: string }) => void;
  'sync-state': (data: { nodes: StoryNode[]; connections: Connection[]; users: User[] }) => void;
}

export interface ClientToServerEvents {
  'join': (data: { roomId: string; user: User }) => void;
  'node-add': (data: { node: StoryNode }) => void;
  'node-update': (data: { node: StoryNode }) => void;
  'node-delete': (data: { nodeId: string }) => void;
  'node-drag': (data: { nodeId: string; x: number; y: number; userId: string }) => void;
  'connection-add': (data: { connection: Connection }) => void;
  'connection-delete': (data: { connectionId: string }) => void;
  'node-editing': (data: { nodeId: string; userId: string }) => void;
}
