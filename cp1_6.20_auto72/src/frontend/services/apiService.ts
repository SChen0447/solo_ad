import axios from 'axios';
import {
  Project,
  Task,
  User,
  Notification,
  DashboardStats,
  ProjectCreateRequest,
  TaskCreateRequest,
  TaskUpdateRequest,
  Dependency,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  createProject: async (data: ProjectCreateRequest): Promise<Project> => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  fetchProjects: async (): Promise<Project[]> => {
    const response = await api.get('/projects');
    return response.data;
  },

  fetchProject: async (projectId: string): Promise<Project> => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  updateProject: async (projectId: string, data: Partial<ProjectCreateRequest>): Promise<Project> => {
    const response = await api.put(`/projects/${projectId}`, data);
    return response.data;
  },

  deleteProject: async (projectId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}`);
  },

  fetchTasks: async (projectId: string): Promise<Task[]> => {
    const response = await api.get(`/projects/${projectId}/tasks`);
    return response.data;
  },

  createTask: async (data: TaskCreateRequest): Promise<Task> => {
    const response = await api.post(`/projects/${data.projectId}/tasks`, data);
    return response.data;
  },

  updateTask: async (taskId: string, data: TaskUpdateRequest): Promise<Task> => {
    const response = await api.put(`/tasks/${taskId}`, data);
    return response.data;
  },

  updateTaskStatus: async (taskId: string, status: Task['status']): Promise<Task> => {
    const response = await api.patch(`/tasks/${taskId}/status`, { status });
    return response.data;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
  },

  addDependency: async (projectId: string, fromTaskId: string, toTaskId: string): Promise<Dependency> => {
    const response = await api.post(`/projects/${projectId}/dependencies`, { fromTaskId, toTaskId });
    return response.data;
  },

  removeDependency: async (dependencyId: string): Promise<void> => {
    await api.delete(`/dependencies/${dependencyId}`);
  },

  fetchDependencies: async (projectId: string): Promise<Dependency[]> => {
    const response = await api.get(`/projects/${projectId}/dependencies`);
    return response.data;
  },

  fetchUsers: async (search?: string): Promise<User[]> => {
    const response = await api.get('/users', { params: search ? { search } : undefined });
    return response.data;
  },

  addProjectMember: async (projectId: string, userId: string): Promise<Project> => {
    const response = await api.post(`/projects/${projectId}/members`, { userId });
    return response.data;
  },

  removeProjectMember: async (projectId: string, userId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
  },

  fetchNotifications: async (): Promise<Notification[]> => {
    const response = await api.get('/notifications');
    return response.data;
  },

  markNotificationRead: async (notificationId: string): Promise<void> => {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  fetchDashboardStats: async (projectId: string): Promise<DashboardStats> => {
    const response = await api.get(`/projects/${projectId}/dashboard`);
    return response.data;
  },

  exportProjectReport: async (projectId: string): Promise<Blob> => {
    const response = await api.get(`/projects/${projectId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
