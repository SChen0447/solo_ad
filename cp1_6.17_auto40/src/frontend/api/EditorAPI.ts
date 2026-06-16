import axios from 'axios';
import { Story, StoryPage, StorySummary } from '../types';

const API_BASE = '/api';

export const EditorAPI = {
  async createStory(title: string, pages: StoryPage[]): Promise<Story> {
    const response = await axios.post<Story>(`${API_BASE}/stories`, { title, pages });
    return response.data;
  },

  async getStory(storyId: string): Promise<Story> {
    const response = await axios.get<Story>(`${API_BASE}/stories/${storyId}`);
    return response.data;
  },

  async updateStory(storyId: string, title: string, pages: StoryPage[]): Promise<Story> {
    const response = await axios.put<Story>(`${API_BASE}/stories/${storyId}`, { title, pages });
    return response.data;
  },

  async getAllStories(): Promise<StorySummary[]> {
    const response = await axios.get<StorySummary[]>(`${API_BASE}/stories`);
    return response.data;
  }
};
