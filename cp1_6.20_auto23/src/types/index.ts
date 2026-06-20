export interface MindMapNode {
  id: string;
  text: string;
  parentId: string | null;
  x: number;
  y: number;
  color: string;
  level: number;
  children: string[];
}

export interface MindMapData {
  rootId: string;
  nodes: Record<string, MindMapNode>;
}

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  color: string;
}

export interface CursorPosition {
  x: number;
  y: number;
}

export interface UserCursor {
  userId: string;
  nickname: string;
  avatar: string;
  color: string;
  position: CursorPosition;
}

export interface OperationNotification {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  type: 'add' | 'delete' | 'edit' | 'move';
  nodeId: string;
  timestamp: number;
}

export interface Room {
  id: string;
  name: string;
  createdAt: number;
  users: User[];
}
