import axios from 'axios';
import type { CombatEvent, Achievement } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const dashboardAPI = {
  async parseLogs(file: File): Promise<{ success: boolean; total: number; events: CombatEvent[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/parse-logs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export const achievementsAPI = {
  async getAchievements(): Promise<Achievement[]> {
    const response = await api.get('/achievements');
    return response.data.achievements;
  },

  async createAchievement(data: {
    name: string;
    monster_type: string;
    target_count: number;
    deadline: string;
  }): Promise<Achievement> {
    const response = await api.post('/achievements', data);
    return response.data.achievement;
  },

  async updateAchievement(
    id: string,
    data: Partial<Achievement>
  ): Promise<Achievement> {
    const response = await api.put(`/achievements/${id}`, data);
    return response.data.achievement;
  },

  async deleteAchievement(id: string): Promise<void> {
    await api.delete(`/achievements/${id}`);
  },

  async calculateProgress(events: CombatEvent[]): Promise<Achievement[]> {
    const response = await api.post('/achievements/calculate-progress', { events });
    return response.data.achievements;
  },
};
