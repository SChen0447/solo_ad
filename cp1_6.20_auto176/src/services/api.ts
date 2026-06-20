import axios from 'axios';
import type { MatchResult, PlantListItem, PlantDetail } from '@/types/plant';

const api = axios.create({
  baseURL: 'http://localhost:5000',
});

export async function matchPlant(histogram: number[]): Promise<MatchResult[]> {
  const response = await api.post<MatchResult[]>('/api/match', { histogram });
  return response.data;
}

export async function getPlants(): Promise<PlantListItem[]> {
  const response = await api.get<{ plants: PlantListItem[] }>('/api/plants');
  return response.data.plants;
}

export async function getPlantDetail(id: number): Promise<PlantDetail> {
  const response = await api.get<PlantDetail>(`/api/plant/${id}`);
  return response.data;
}

export async function getFamilies(): Promise<string[]> {
  const response = await api.get<{ families: string[] }>('/api/families');
  return response.data.families;
}
