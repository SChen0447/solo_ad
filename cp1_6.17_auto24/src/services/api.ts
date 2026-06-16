import axios from 'axios';
import { HistoryRecord, MindMapState } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const apiService = {
  async getHistory(): Promise<HistoryRecord[]> {
    const response = await api.get('/history');
    return response.data;
  },

  async getMindMap(): Promise<MindMapState> {
    const response = await api.get('/mindmap');
    return response.data;
  },

  async exportJSON(): Promise<MindMapState> {
    const response = await api.get('/mindmap');
    return response.data;
  },

  downloadJSON(state: MindMapState): void {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mindmap-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  async getOnlineUsers(): Promise<{ count: number; users: string[] }> {
    const response = await api.get('/users');
    return response.data;
  },
};
