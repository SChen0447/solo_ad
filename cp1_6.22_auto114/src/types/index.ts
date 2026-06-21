export interface Work {
  id: string;
  title: string;
  price: number;
  productionDays: number;
  materials: string;
  description: string;
  thumbnail: string;
  images: string[];
  availableSizes: string[];
  availableColors: string[];
  artisan: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'making' | 'shipped' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  workId: string;
  workTitle: string;
  workImage: string;
  size: string;
  color: string;
  engraving: string;
  price: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  workId: string;
  userName: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
}

export interface CustomOrderData {
  workId: string;
  size: string;
  color: string;
  engraving: string;
  price: number;
}

export interface ReviewData {
  workId: string;
  userName: string;
  rating: number;
  comment: string;
  images: File[];
}
