import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export interface FormField {
  id: string;
  type: 'text' | 'radio' | 'checkbox' | 'select' | 'rating' | 'file';
  label: string;
  options?: string[];
  required?: boolean;
  width?: number;
}

export interface Form {
  id: string;
  title: string;
  fields: FormField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Submission {
  id: string;
  data: Record<string, any>;
  submittedAt: string;
}

export interface FormStats {
  formId: string;
  total: number;
  todayCount: number;
  last7Days: { date: string; count: number }[];
  fieldDistributions: Record<string, { label: string; data: { name: string; value: number }[] }>;
}

export const formApi = {
  getForms: () => api.get<Form[]>('/forms').then(r => r.data),
  createForm: (data: Partial<Form>) => api.post<Form>('/forms', data).then(r => r.data),
  getForm: (id: string) => api.get<Form>(`/forms/${id}`).then(r => r.data),
  updateForm: (id: string, data: Partial<Form>) => api.put<Form>(`/forms/${id}`, data).then(r => r.data),
  deleteForm: (id: string) => api.delete(`/forms/${id}`).then(r => r.data),
  submitForm: (id: string, data: Record<string, any>) => api.post(`/forms/${id}/submit`, data).then(r => r.data),
  getSubmissions: (id: string) => api.get<Submission[]>(`/forms/${id}/submissions`).then(r => r.data),
  getStats: (id: string) => api.get<FormStats>(`/forms/${id}/stats`).then(r => r.data)
};

export default formApi;
