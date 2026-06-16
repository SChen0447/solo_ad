export interface MindMapNode {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  radius: number;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface HistoryRecord {
  id: string;
  type: 'create' | 'edit' | 'move' | 'delete' | 'connect' | 'disconnect' | 'rollback';
  username: string;
  timestamp: number;
  description: string;
  state: MindMapState;
}

export interface MindMapState {
  nodes: MindMapNode[];
  connections: Connection[];
}

export interface ServerEvent {
  type: string;
  payload: any;
  username?: string;
  timestamp?: number;
}
