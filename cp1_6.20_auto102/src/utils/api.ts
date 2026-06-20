import axios, { AxiosProgressEvent } from 'axios';

const BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
});

export interface UploadResponse {
  file_id: string;
  filename: string;
  message: string;
}

export interface SkillItem {
  name: string;
  score: number;
}

export interface SuggestionItem {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

export interface AnalysisResult {
  analysis_id: string;
  job_title: string;
  skills: SkillItem[];
  missing_skills: string[];
  overall_score: number;
  suggestions: SuggestionItem[];
  extracted_info: {
    name: string;
    education: string;
    experience_years: number;
    projects_count: number;
  };
  created_at: string;
}

export interface HistoryItem {
  analysis_id: string;
  job_title: string;
  overall_score: number;
  created_at: string;
}

export const uploadResume = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<UploadResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (event.total && onProgress) {
        const percent = Math.round((event.loaded * 100) / event.total);
        onProgress(percent);
      }
    }
  });

  return response.data;
};

export const analyzeResume = async (
  fileId: string,
  jobTitle: string,
  bioText: string = ''
): Promise<AnalysisResult> => {
  const response = await api.post<AnalysisResult>('/analyze', {
    file_id: fileId,
    job_title: jobTitle,
    bio_text: bioText
  });
  return response.data;
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  const response = await api.get<HistoryItem[]>('/history');
  return response.data;
};

export const getAnalysisDetail = async (analysisId: string): Promise<AnalysisResult> => {
  const response = await api.get<AnalysisResult>(`/history/${analysisId}`);
  return response.data;
};

export const getJobSuggestions = async (query: string): Promise<string[]> => {
  const response = await api.get<{ suggestions: string[] }>('/suggestions', {
    params: { q: query }
  });
  return response.data.suggestions;
};

export default api;
