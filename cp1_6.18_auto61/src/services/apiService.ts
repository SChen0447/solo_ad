import axios from 'axios';
import type { Mood } from '../../server/mockData';

export type { Mood };

export interface SummaryItem {
  id: string;
  text: string;
  mood: Mood;
}

export interface MusicTrack {
  id: string;
  title: string;
  duration: string;
  mood: Mood;
  previewUrl: string;
}

export interface SummaryResponse {
  summaries: SummaryItem[];
}

export interface MatchMusicResponse {
  matches: Record<string, MusicTrack[]>;
}

export interface ExportPayload {
  summaries: {
    id: string;
    text: string;
    music: MusicTrack | null;
    order: number;
  }[];
}

export interface ExportResponse {
  html: string;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const apiService = {
  async generateSummary(text: string): Promise<SummaryResponse> {
    const response = await api.post<SummaryResponse>('/summary', { text });
    return response.data;
  },

  async matchMusic(summaries: SummaryItem[]): Promise<MatchMusicResponse> {
    const response = await api.post<MatchMusicResponse>('/match-music', { summaries });
    return response.data;
  },

  async exportReport(payload: ExportPayload): Promise<ExportResponse> {
    const response = await api.post<ExportResponse>('/export', payload);
    return response.data;
  },
};
