import axios from 'axios';
import type { ChromosomeStructure, Gene } from './types';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchChromosomeStructure(): Promise<ChromosomeStructure> {
  try {
    const response = await apiClient.get<ChromosomeStructure>('/structure');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch chromosome structure:', error);
    throw error;
  }
}

export async function fetchGeneDetail(geneId: string): Promise<Gene> {
  try {
    const response = await apiClient.get<Gene>(`/gene/${geneId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch gene detail for ${geneId}:`, error);
    throw error;
  }
}
