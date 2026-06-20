import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error) => {
    console.error('Response error:', error);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export const ApiService = {
  get: <T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> => {
    return api.get(url, { params });
  },

  post: <T = unknown>(url: string, data?: unknown): Promise<T> => {
    return api.post(url, data);
  },

  put: <T = unknown>(url: string, data?: unknown): Promise<T> => {
    return api.put(url, data);
  },

  delete: <T = unknown>(url: string): Promise<T> => {
    return api.delete(url);
  },
};

export default ApiService;
