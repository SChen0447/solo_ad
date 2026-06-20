import { io, Socket } from 'socket.io-client';
import { Task, Notification } from '../types';

type TaskUpdateHandler = (task: Task) => void;
type TaskCreateHandler = (task: Task) => void;
type TaskDeleteHandler = (taskId: string) => void;
type NotificationHandler = (notification: Notification) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private currentProjectId: string | null = null;
  private taskUpdateHandlers: Set<TaskUpdateHandler> = new Set();
  private taskCreateHandlers: Set<TaskCreateHandler> = new Set();
  private taskDeleteHandlers: Set<TaskDeleteHandler> = new Set();
  private notificationHandlers: Set<NotificationHandler> = new Set();

  connect(): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    this.socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      if (this.currentProjectId) {
        this.subscribeToProject(this.currentProjectId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('task_updated', (task: Task) => {
      this.taskUpdateHandlers.forEach((handler) => handler(task));
    });

    this.socket.on('task_created', (task: Task) => {
      this.taskCreateHandlers.forEach((handler) => handler(task));
    });

    this.socket.on('task_deleted', (taskId: string) => {
      this.taskDeleteHandlers.forEach((handler) => handler(taskId));
    });

    this.socket.on('new_notification', (notification: Notification) => {
      this.notificationHandlers.forEach((handler) => handler(notification));
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentProjectId = null;
  }

  subscribeToProject(projectId: string): void {
    this.currentProjectId = projectId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_project', { projectId });
    }
  }

  unsubscribeFromProject(projectId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_project', { projectId });
    }
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }
  }

  emitTaskUpdate(task: Task): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('task_update', { task });
    }
  }

  onTaskUpdated(handler: TaskUpdateHandler): () => void {
    this.taskUpdateHandlers.add(handler);
    return () => this.taskUpdateHandlers.delete(handler);
  }

  onTaskCreated(handler: TaskCreateHandler): () => void {
    this.taskCreateHandlers.add(handler);
    return () => this.taskCreateHandlers.delete(handler);
  }

  onTaskDeleted(handler: TaskDeleteHandler): () => void {
    this.taskDeleteHandlers.add(handler);
    return () => this.taskDeleteHandlers.delete(handler);
  }

  onNotification(handler: NotificationHandler): () => void {
    this.notificationHandlers.add(handler);
    return () => this.notificationHandlers.delete(handler);
  }
}

export const websocketService = new WebSocketService();
