import { apiRequest } from '../../api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../../types';

export const UserService = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/user/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/user/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getCurrentUser(): Promise<User> {
    return apiRequest<User>('/user/me');
  },

  async getUserById(id: string): Promise<User> {
    return apiRequest<User>(`/user/${id}`);
  }
};
