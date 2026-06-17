import axios from 'axios';
import type {
  Product,
  Message,
  CreateProductRequest,
  CreateMessageRequest,
} from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const productApi = {
  getAllProducts: (): Promise<Product[]> => api.get('/products').then((r) => r.data),
  getProduct: (id: string): Promise<Product> =>
    api.get(`/products/${id}`).then((r) => r.data),
  createProduct: (data: CreateProductRequest): Promise<Product> =>
    api.post('/products', data).then((r) => r.data),
  updateProductPrice: (
    id: string,
    priceAdjustment: number
  ): Promise<Product> =>
    api
      .patch(`/products/${id}/price`, { priceAdjustment })
      .then((r) => r.data),
};

export const messageApi = {
  getMessages: (productId: string): Promise<Message[]> =>
    api.get(`/products/${productId}/messages`).then((r) => r.data),
  createMessage: (data: CreateMessageRequest): Promise<Message> =>
    api.post('/messages', data).then((r) => r.data),
  confirmOffer: (messageId: string): Promise<Message> =>
    api.post(`/messages/${messageId}/confirm`).then((r) => r.data),
};

export default api;
