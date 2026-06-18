import { apiRequest } from '../../api';
import { Product, ProductListResponse, Order, CreateProductRequest } from '../../types';

interface SearchParams {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export const ProductService = {
  async createProduct(data: CreateProductRequest): Promise<Product> {
    return apiRequest<Product>('/product', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async searchProducts(params: SearchParams): Promise<ProductListResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    return apiRequest<ProductListResponse>(`/product?${queryParams.toString()}`);
  },

  async getMyProducts(): Promise<Product[]> {
    return apiRequest<Product[]>('/product/my');
  },

  async getProductById(id: string): Promise<Product> {
    return apiRequest<Product>(`/product/${id}`);
  },

  async updateProduct(id: string, data: Partial<CreateProductRequest>): Promise<Product> {
    return apiRequest<Product>(`/product/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async removeProduct(id: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/product/${id}/remove`, {
      method: 'PATCH'
    });
  },

  async buyProduct(id: string, quantity: number = 1): Promise<Order> {
    return apiRequest<Order>(`/product/${id}/buy`, {
      method: 'POST',
      body: JSON.stringify({ quantity })
    });
  },

  async getMyOrders(role: 'buyer' | 'seller' = 'buyer'): Promise<Order[]> {
    return apiRequest<Order[]>(`/product/orders/my?role=${role}`);
  },

  async shipOrder(orderId: string, deliveryInfo: string): Promise<Order> {
    return apiRequest<Order>(`/product/orders/${orderId}/ship`, {
      method: 'PATCH',
      body: JSON.stringify({ deliveryInfo })
    });
  },

  async confirmOrder(orderId: string): Promise<Order> {
    return apiRequest<Order>(`/product/orders/${orderId}/confirm`, {
      method: 'PATCH'
    });
  }
};
