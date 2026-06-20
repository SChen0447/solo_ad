import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { email: string; password: string; nickname: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const petAPI = {
  getPets: (params?: { page?: number; per_page?: number; status?: string }) =>
    api.get('/pets', { params }),
  getPet: (id: number) => api.get(`/pets/${id}`),
  createPet: (data: FormData | object) => api.post('/pets', data),
  updatePet: (id: number, data: object) => api.put(`/pets/${id}`, data),
};

export const favoriteAPI = {
  getFavorites: () => api.get('/favorites'),
  toggleFavorite: (petId: number) => api.post(`/pets/${petId}/favorite`),
};

export const applicationAPI = {
  submit: (data: { pet_id: number; introduction: string; experience: string }) =>
    api.post('/applications', data),
  getApplications: (params?: { status?: string }) =>
    api.get('/applications', { params }),
  updateApplication: (id: number, data: { status: string }) =>
    api.put(`/applications/${id}`, data),
  myApplications: () => api.get('/my-applications'),
};

export const postAPI = {
  getPosts: (params?: { page?: number; per_page?: number }) =>
    api.get('/posts', { params }),
  createPost: (data: { content: string; images: string[] }) =>
    api.post('/posts', data),
  toggleLike: (postId: number) => api.post(`/posts/${postId}/like`),
  getComments: (postId: number) => api.get(`/posts/${postId}/comments`),
  addComment: (postId: number, content: string) =>
    api.post(`/posts/${postId}/comments`, { content }),
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
};

export const uploadAPI = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
