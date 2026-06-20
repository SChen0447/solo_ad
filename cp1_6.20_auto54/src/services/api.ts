import axios, { AxiosInstance } from 'axios';
import { io, Socket } from 'socket.io-client';
import { User, Assignment, EvaluationResult, SubmissionsResponse, EvaluationProgress } from '../types';

const BASE_URL = '/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const getSocket = (): Socket | null => socket;

export const closeSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const subscribeToChannel = (channel: string): void => {
  if (socket) {
    socket.emit('subscribe', { channel });
  }
};

export const onEvaluationProgress = (
  callback: (data: EvaluationProgress) => void
): (() => void) => {
  if (!socket) initSocket();
  const handler = (data: EvaluationProgress) => callback(data);
  socket!.on('evaluation_progress', handler);
  return () => socket!.off('evaluation_progress', handler);
};

export const onEvaluationComplete = (
  callback: (data: EvaluationResult) => void
): (() => void) => {
  if (!socket) initSocket();
  const handler = (data: EvaluationResult) => callback(data);
  socket!.on('evaluation_complete', handler);
  return () => socket!.off('evaluation_complete', handler);
};

export const login = async (email: string, password: string): Promise<User> => {
  const response = await api.post('/login', { email, password });
  return response.data;
};

export const register = async (email: string, password: string): Promise<User> => {
  const response = await api.post('/register', { email, password });
  return response.data;
};

export const getAssignments = async (): Promise<Assignment[]> => {
  const response = await api.get('/assignments');
  return response.data.assignments;
};

export const runTests = async (code: string, assignmentId: string): Promise<void> => {
  await api.post('/run_tests', { code, assignment_id: assignmentId });
};

export const getResult = async (submissionId: string): Promise<EvaluationResult> => {
  const response = await api.get(`/results/${submissionId}`);
  return response.data;
};

export const getSubmissions = async (page: number = 1, perPage: number = 10): Promise<SubmissionsResponse> => {
  const response = await api.get('/submissions', {
    params: { page, per_page: perPage },
  });
  return response.data;
};

export const saveToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

export default api;
