import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const get = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return api.get(url, config)
}

export const post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  return api.post(url, data, config)
}

export const put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  return api.put(url, data, config)
}

export const del = <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return api.delete(url, config)
}

export default api
