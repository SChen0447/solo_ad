import type { Note } from '../types';

const BASE_URL = '/api';

export const notesApi = {
  async getNotes(week?: string): Promise<Note[]> {
    const url = week 
      ? `${BASE_URL}/notes?week=${encodeURIComponent(week)}`
      : `${BASE_URL}/notes`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('获取便签失败');
    }
    return response.json();
  },

  async createNote(note: { content: string; mood: string; createdAt?: string }): Promise<Note> {
    const response = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(note),
    });
    if (!response.ok) {
      throw new Error('创建便签失败');
    }
    return response.json();
  },

  async deleteNote(id: string): Promise<{ success: boolean }> {
    const response = await fetch(`${BASE_URL}/notes/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('删除便签失败');
    }
    return response.json();
  }
};
