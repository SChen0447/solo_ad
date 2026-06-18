export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar: string;
  createdAt: string;
  creditScore: number;
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
}

export interface Database {
  users: User[];
  products: Product[];
  orders: Order[];
  reviews: Review[];
}
