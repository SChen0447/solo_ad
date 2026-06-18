export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  createdAt: string;
  creditScore: string;
  reviewCount: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: 'ebook' | 'course' | 'software' | 'other';
  price: number;
  stock: number;
  negotiable: boolean;
  sellerId: string;
  status: 'active' | 'sold' | 'removed';
  createdAt: string;
  updatedAt: string;
  seller?: User;
  productRating?: string;
  reviewCount?: number;
}

export interface Order {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  quantity: number;
  status: 'pending' | 'shipped' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  deliveryInfo?: string;
  product?: {
    id: string;
    title: string;
    price: number;
  };
  buyer?: {
    id: string;
    username: string;
    avatar: string;
  };
  seller?: {
    id: string;
    username: string;
    avatar: string;
  };
}

export interface Review {
  id: string;
  orderId: string;
  productId: string;
  reviewerId: string;
  targetId: string;
  rating: number;
  comment: string;
  type: 'product' | 'buyer' | 'seller';
  createdAt: string;
  reviewer?: {
    id: string;
    username: string;
    avatar: string;
  };
  product?: {
    id: string;
    title: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProductRequest {
  title: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  negotiable: boolean;
}

export interface CreateReviewRequest {
  orderId: string;
  productId: string;
  targetId: string;
  rating: number;
  comment: string;
  type: 'product' | 'buyer' | 'seller';
}
