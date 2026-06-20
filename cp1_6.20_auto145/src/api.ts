import axios from 'axios';
import { Survey, SurveyResponse, SurveyStats } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export const createSurvey = async (survey: Omit<Survey, 'id'>): Promise<Survey> => {
  const { data } = await api.post('/surveys', survey);
  if (!data.success) throw new Error(data.error || 'Failed to create survey');
  return data.survey;
};

export const listSurveys = async (): Promise<Survey[]> => {
  const { data } = await api.get('/surveys');
  if (!data.success) throw new Error(data.error || 'Failed to fetch surveys');
  return data.surveys;
};

export const getSurvey = async (id: string): Promise<Survey> => {
  const { data } = await api.get(`/surveys/${id}`);
  if (!data.success) throw new Error(data.error || 'Failed to fetch survey');
  return data.survey;
};

export const deleteSurvey = async (id: string): Promise<void> => {
  const { data } = await api.delete(`/surveys/${id}`);
  if (!data.success) throw new Error(data.error || 'Failed to delete survey');
};

export const closeSurvey = async (id: string): Promise<Survey> => {
  const { data } = await api.post(`/surveys/${id}/close`);
  if (!data.success) throw new Error(data.error || 'Failed to close survey');
  return data.survey;
};

export const submitResponse = async (
  surveyId: string,
  payload: Omit<SurveyResponse, 'id' | 'survey_id'>
): Promise<SurveyResponse> => {
  const { data } = await api.post(`/surveys/${surveyId}/responses', payload);
  if (!data.success) {
    const error = new Error(data.error || 'Failed to submit response');
    (error as any).status = data.status || 'error';
    throw error;
  }
  return data.response;
};

export const getStats = async (surveyId: string): Promise<SurveyStats> => {
  const { data } = await api.get(`/surveys/${surveyId}/stats`);
  if (!data.success) throw new Error(data.error || 'Failed to fetch stats');
  return data.stats;
};

export const listResponses = async (surveyId: string): Promise<SurveyResponse[]> => {
  const { data } = await api.get(`/surveys/${surveyId}/responses`);
  if (!data.success) throw new Error(data.error || 'Failed to fetch responses');
  return data.responses;
};

export default api;
