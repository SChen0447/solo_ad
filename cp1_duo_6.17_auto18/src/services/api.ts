import axios from 'axios';
import type { GradientTemplate, GradientConfig, ApiResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export async function getTemplates(): Promise<GradientTemplate[]> {
  try {
    const response = await api.get<ApiResponse<GradientTemplate[]>>('/templates');
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return [];
  }
}

export async function saveTemplate(
  name: string,
  config: GradientConfig
): Promise<GradientTemplate | null> {
  try {
    const response = await api.post<ApiResponse<GradientTemplate>>('/templates', {
      name,
      config,
    });
    return response.data.data || null;
  } catch (error) {
    console.error('Failed to save template:', error);
    return null;
  }
}

export async function deleteTemplate(id: string): Promise<boolean> {
  try {
    const response = await api.delete<ApiResponse<null>>(`/templates/${id}`);
    return response.data.success;
  } catch (error) {
    console.error('Failed to delete template:', error);
    return false;
  }
}
