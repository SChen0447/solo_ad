import { v4 as uuidv4 } from 'uuid';

export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface MindMapData {
  id: string;
  nodes: Record<string, MindMapNode>;
  createdAt: number;
  updatedAt: number;
}

export interface EditingUser {
  socketId: string;
  userId: string;
  color: string;
  userName: string;
  nodeId: string | null;
}

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#a855f7', '#ef4444',
];

export class MapModel {
  private mindMaps: Record<string, MindMapData> = {};
  private editingUsers: Record<string, Record<string, EditingUser>> = {};

  getRandomColor(): string {
    return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  }

  createMindMap(): MindMapData {
    const id = uuidv4();
    const now = Date.now();
    const rootNodeId = uuidv4();
    
    this.mindMaps[id] = {
      id,
      nodes: {
        [rootNodeId]: {
          id: rootNodeId,
          text: '中心主题',
          x: 0,
          y: 0,
          color: '#6366f1',
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      createdAt: now,
      updatedAt: now,
    };

    this.editingUsers[id] = {};
    return this.mindMaps[id];
  }

  getMindMap(mapId: string): MindMapData | undefined {
    return this.mindMaps[mapId];
  }

  addNode(mapId: string, parentId: string | null, x: number, y: number, color?: string, text?: string): MindMapNode | undefined {
    const map = this.mindMaps[mapId];
    if (!map) return undefined;

    const id = uuidv4();
    const now = Date.now();
    const node: MindMapNode = {
      id,
      text: text || '新节点',
      x,
      y,
      color: color || this.getRandomColor(),
      parentId,
      createdAt: now,
      updatedAt: now,
    };

    map.nodes[id] = node;
    map.updatedAt = now;
    return node;
  }

  updateNode(mapId: string, nodeId: string, updates: Partial<Omit<MindMapNode, 'id' | 'createdAt'>>): MindMapNode | undefined {
    const map = this.mindMaps[mapId];
    if (!map || !map.nodes[nodeId]) return undefined;

    map.nodes[nodeId] = {
      ...map.nodes[nodeId],
      ...updates,
      updatedAt: Date.now(),
    };
    map.updatedAt = Date.now();
    return map.nodes[nodeId];
  }

  deleteNode(mapId: string, nodeId: string): boolean {
    const map = this.mindMaps[mapId];
    if (!map || !map.nodes[nodeId]) return false;

    const deleteRecursive = (id: string) => {
      Object.values(map.nodes).forEach(n => {
        if (n.parentId === id) deleteRecursive(n.id);
      });
      delete map.nodes[id];
    };

    deleteRecursive(nodeId);
    map.updatedAt = Date.now();
    return true;
  }

  addEditingUser(mapId: string, user: EditingUser): void {
    if (!this.editingUsers[mapId]) {
      this.editingUsers[mapId] = {};
    }
    this.editingUsers[mapId][user.socketId] = user;
  }

  removeEditingUser(mapId: string, socketId: string): void {
    if (this.editingUsers[mapId]) {
      delete this.editingUsers[mapId][socketId];
    }
  }

  updateEditingUserNode(mapId: string, socketId: string, nodeId: string | null): void {
    if (this.editingUsers[mapId] && this.editingUsers[mapId][socketId]) {
      this.editingUsers[mapId][socketId].nodeId = nodeId;
    }
  }

  getEditingUsers(mapId: string): EditingUser[] {
    if (!this.editingUsers[mapId]) return [];
    return Object.values(this.editingUsers[mapId]);
  }

  getNodeEditingUsers(mapId: string, nodeId: string): EditingUser[] {
    return this.getEditingUsers(mapId).filter(u => u.nodeId === nodeId);
  }
}
