import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import type { UIComponent, Project, Version } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const projectApi = {
  create: (name?: string) =>
    api.post<Project>('/projects', { name }).then((r) => r.data),
  get: (id: string) =>
    api.get<{ project: Project; components: UIComponent[] }>(`/projects/${id}`).then((r) => r.data),
  getComponents: (projectId: string) =>
    api.get<UIComponent[]>(`/projects/${projectId}/components`).then((r) => r.data),
  addComponent: (projectId: string, data: Partial<UIComponent> & { author?: string }) =>
    api.post<UIComponent>(`/projects/${projectId}/components`, data).then((r) => r.data),
  export: (projectId: string) =>
    api.post(`/projects/${projectId}/export`, {}, { responseType: 'blob' }).then((r) => r.data),
};

export const componentApi = {
  update: (id: string, data: Partial<UIComponent> & { author?: string }) =>
    api.put<UIComponent>(`/components/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/components/${id}`).then((r) => r.data),
};

export const versionApi = {
  getByProject: (projectId: string) =>
    api.get<Version[]>(`/projects/${projectId}/versions`).then((r) => r.data),
  restore: (versionId: string) =>
    api.post<{ success: boolean }>(`/versions/${versionId}/restore`).then((r) => r.data),
};

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
  }
  return socketInstance;
};

export const snapToGrid = (value: number, gridSize: number = 20): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const easeOutQuad = (t: number): number => {
  return t * (2 - t);
};

export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
