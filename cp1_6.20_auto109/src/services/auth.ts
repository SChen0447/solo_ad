import axiosInstance from './api';
import { AuthResponse, User } from '../types';

export const login = async (identifier: string, password: string): Promise<AuthResponse> => {
  const response = await axiosInstance.post('/login', { identifier, password });
  return response.data;
};

export const register = async (
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await axiosInstance.post('/register', { username, email, password });
  return response.data;
};

export const getCurrentUser = async (): Promise<{ user: User }> => {
  const response = await axiosInstance.get('/auth/me');
  return response.data;
};
