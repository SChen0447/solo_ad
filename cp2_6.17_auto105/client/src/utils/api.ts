import type { Inspiration, Tag, StarChartData } from '../types';

const API_BASE = '/api';

export const api = {
  async getInspirations(): Promise<Inspiration[]> {
    const res = await fetch(`${API_BASE}/inspirations`);
    if (!res.ok) throw new Error('获取灵感列表失败');
    return res.json();
  },

  async getInspiration(id: string): Promise<Inspiration> {
    const res = await fetch(`${API_BASE}/inspirations/${id}`);
    if (!res.ok) throw new Error('获取灵感详情失败');
    return res.json();
  },

  async createInspiration(data: Omit<Inspiration, 'id' | 'createdAt' | 'updatedAt' | 'isFavorite'>): Promise<Inspiration> {
    const res = await fetch(`${API_BASE}/inspirations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('创建灵感失败');
    return res.json();
  },

  async updateInspiration(id: string, data: Partial<Inspiration>): Promise<Inspiration> {
    const res = await fetch(`${API_BASE}/inspirations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('更新灵感失败');
    return res.json();
  },

  async deleteInspiration(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/inspirations/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('删除灵感失败');
    return res.json();
  },

  async getTags(): Promise<Tag[]> {
    const res = await fetch(`${API_BASE}/tags`);
    if (!res.ok) throw new Error('获取标签列表失败');
    return res.json();
  },

  async updateTag(name: string, data: { name?: string; color?: string }): Promise<Tag> {
    const res = await fetch(`${API_BASE}/tags/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('更新标签失败');
    return res.json();
  },

  async deleteTag(name: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/tags/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('删除标签失败');
    return res.json();
  },

  async getStarChart(): Promise<StarChartData> {
    const res = await fetch(`${API_BASE}/star-chart`);
    if (!res.ok) throw new Error('获取星图数据失败');
    return res.json();
  }
};
