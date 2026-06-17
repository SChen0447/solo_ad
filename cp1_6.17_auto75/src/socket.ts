import { io, Socket } from 'socket.io-client';

export interface MindmapNode {
  id: string;
  parent_id: string | null;
  text: string;
  color: string;
  x: number;
  y: number;
  creator_id: string;
}

export interface Task {
  id: string;
  node_id: string;
  text: string;
  color: string;
  status: 'todo' | 'in-progress' | 'done';
  creator_id: string;
}

export interface RoomState {
  id: string;
  nodes: Record<string, MindmapNode>;
  tasks: {
    todo: Task[];
    'in-progress': Task[];
    done: Task[];
  };
}

type EventCallback = (...args: any[]) => void;

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private roomId: string = '';
  private userId: string = '';

  connect(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;

    this.socket = io({
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.socket?.emit('join', { room_id: roomId, user_id: userId });
    });

    this.socket.onAny((event, ...args) => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.forEach(cb => cb(...args));
      }
    });

    return this;
  }

  disconnect() {
    if (this.socket) {
      this.socket.emit('leave', { room_id: this.roomId, user_id: this.userId });
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event: string, data: any = {}) {
    if (this.socket) {
      this.socket.emit(event, { ...data, room_id: this.roomId });
    }
  }

  createNode(node: MindmapNode) {
    this.emit('node_create', { node });
  }

  updateNode(nodeId: string, updates: Partial<MindmapNode>) {
    this.emit('node_update', { node_id: nodeId, updates });
  }

  deleteNode(nodeId: string) {
    this.emit('node_delete', { node_id: nodeId });
  }

  mergeNodes(nodeIds: string[], primaryNodeId: string, newText: string) {
    this.emit('node_merge', {
      node_ids: nodeIds,
      primary_node_id: primaryNodeId,
      new_text: newText,
    });
  }

  createTask(nodeId: string, creatorId: string) {
    this.emit('task_create', { node_id: nodeId, creator_id: creatorId });
  }

  updateTask(taskId: string, newStatus: string, newIndex: number) {
    this.emit('task_update', { task_id: taskId, new_status: newStatus, new_index: newIndex });
  }

  deleteTask(taskId: string) {
    this.emit('task_delete', { task_id: taskId });
  }

  getUserId() {
    return this.userId;
  }
}

export const socketManager = new SocketManager();
