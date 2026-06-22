import { io, Socket } from 'socket.io-client';
import type {
  User,
  Board,
  Task,
  Notification,
  LoginResponse,
} from '../types';

const API_BASE = '/api';

let sessionId: string | null = localStorage.getItem('sessionId');
let currentUser: User | null = null;
let socket: Socket | null = null;

export function getSessionId(): string | null {
  return sessionId;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function setSession(sId: string, user: User): void {
  sessionId = sId;
  currentUser = user;
  localStorage.setItem('sessionId', sId);
}

export function clearSession(): void {
  sessionId = null;
  currentUser = null;
  localStorage.removeItem('sessionId');
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionId) {
    headers['x-session-id'] = sessionId;
  }
  return headers;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

export async function login(username: string): Promise<LoginResponse> {
  const response = await request<LoginResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  
  setSession(response.sessionId, response.user);
  return response;
}

export async function getUsers(): Promise<User[]> {
  return request<User[]>('/users');
}

export async function getBoards(): Promise<Board[]> {
  return request<Board[]>('/boards');
}

export async function createBoard(name: string, memberIds: string[] = [] ): Promise<Board> {
  return request<Board>('/boards', {
    method: 'POST',
    body: JSON.stringify({ name, memberIds }),
  });
}

export async function getBoard(boardId: string): Promise<Board> {
  return request<Board>(`/boards/${boardId}`);
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  return request<Task>(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function moveTask(taskId: string, laneId: string, order: number): Promise<Task> {
  return request<Task>(`/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({ laneId, order }),
  });
}

export async function addComment(
  taskId: string,
  content: string,
  mentions: string[] = []
): Promise<Task> {
  return request<Task>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, mentions }),
  });
}

export async function getNotifications(): Promise<Notification[]> {
  return request<Notification[]>('/notifications');
}

export async function markNotificationRead(notificationId: string): Promise<Notification> {
  return request<Notification>(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function subscribeToBoard(
  boardId: string,
  userId: string,
  callbacks: {
    onTaskUpdated: (task: Task) => void;
    onTaskMoved: (data: { taskId: string; laneId: string; order: number }) => void;
    onNotification: (notification: Notification) => void;
    onUserPresence: (data: { userId: string; online: boolean }) => void;
  }
): () => void {
  const s = getSocket();
  
  s.emit('joinBoard', { boardId, userId });
  
  s.on('taskUpdated', callbacks.onTaskUpdated);
  s.on('taskMoved', callbacks.onTaskMoved);
  s.on('notification', callbacks.onNotification);
  s.on('userPresence', callbacks.onUserPresence);
  
  return () => {
    s.off('taskUpdated', callbacks.onTaskUpdated);
    s.off('taskMoved', callbacks.onTaskMoved);
    s.off('notification', callbacks.onNotification);
    s.off('userPresence', callbacks.onUserPresence);
    s.emit('leaveBoard