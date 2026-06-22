import { Device, Scene, SceneExecutionResult } from '../types';

const API_BASE = '/api';

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export const deviceApi = {
  getAll: (): Promise<Device[]> =>
    fetch(`${API_BASE}/devices`).then(handleResponse<Device[]>),

  getById: (id: string): Promise<Device> =>
    fetch(`${API_BASE}/devices/${id}`).then(handleResponse<Device>),

  create: (data: Partial<Device>): Promise<Device> =>
    fetch(`${API_BASE}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Device>),

  update: (id: string, data: Partial<Device>): Promise<Device> =>
    fetch(`${API_BASE}/devices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Device>),

  delete: (id: string): Promise<{ message: string }> =>
    fetch(`${API_BASE}/devices/${id}`, {
      method: 'DELETE',
    }).then(handleResponse<{ message: string }>),
};

export const sceneApi = {
  getAll: (): Promise<Scene[]> =>
    fetch(`${API_BASE}/scenes`).then(handleResponse<Scene[]>),

  getById: (id: string): Promise<Scene> =>
    fetch(`${API_BASE}/scenes/${id}`).then(handleResponse<Scene>),

  create: (data: Partial<Scene>): Promise<Scene> =>
    fetch(`${API_BASE}/scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Scene>),

  update: (id: string, data: Partial<Scene>): Promise<Scene> =>
    fetch(`${API_BASE}/scenes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<Scene>),

  delete: (id: string): Promise<{ message: string }> =>
    fetch(`${API_BASE}/scenes/${id}`, {
      method: 'DELETE',
    }).then(handleResponse<{ message: string }>),

  execute: (id: string): Promise<SceneExecutionResult> =>
    fetch(`${API_BASE}/scenes/${id}/execute`, {
      method: 'POST',
    }).then(handleResponse<SceneExecutionResult>),

  simulate: (id: string): Promise<SceneExecutionResult> =>
    fetch(`${API_BASE}/scenes/${id}/simulate`, {
      method: 'POST',
    }).then(handleResponse<SceneExecutionResult>),
};
