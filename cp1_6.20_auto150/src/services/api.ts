import axios from 'axios';
import type { UploadResponse, ReportData } from '../types';

const API_BASE_URL = 'http://localhost:5000';

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await axios.post<UploadResponse>(
    `${API_BASE_URL}/api/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

export async function generateReport(reportData: ReportData): Promise<{ success: boolean; url: string }> {
  const response = await axios.post<{ success: boolean; url: string }>(
    `${API_BASE_URL}/api/report`,
    reportData
  );

  return response.data;
}
