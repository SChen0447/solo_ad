import axios from 'axios';
import type { PlanFormData, PlanBookData } from '../types';

export async function generatePlanbook(formData: PlanFormData): Promise<PlanBookData> {
  const response = await axios.post<PlanBookData>('/api/generate-planbook', formData);
  return response.data;
}

export async function generatePdf(planData: PlanBookData): Promise<{ pdfUrl: string; shareUrl: string }> {
  const response = await axios.post<{ pdfUrl: string; shareUrl: string }>('/api/generate-pdf', planData);
  return response.data;
}

export async function getShareData(uuid: string): Promise<PlanBookData> {
  const response = await axios.get<PlanBookData>(`/api/share/${uuid}`);
  return response.data;
}
