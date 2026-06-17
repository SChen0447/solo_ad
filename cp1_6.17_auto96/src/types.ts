export type AnnotationType = 'rectangle' | 'arrow';

export interface Annotation {
  id: string;
  type: AnnotationType;
  imageIndex: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  label?: string;
}

export interface Photo {
  id: string;
  url: string;
  name: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  currentPrice: number;
  photos: Photo[];
  annotations: Annotation[];
  sellerId: string;
  createdAt: string;
}

export type UserRole = 'buyer' | 'seller';

export interface Message {
  id: string;
  productId: string;
  annotationId: string | null;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: UserRole;
  content: string;
  priceOffer?: number;
  isConfirmed?: boolean;
  createdAt: string;
}

export interface CreateProductRequest {
  title: string;
  description: string;
  originalPrice: number;
  photos: Photo[];
  annotations: Annotation[];
}

export interface CreateMessageRequest {
  productId: string;
  annotationId: string | null;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: UserRole;
  content: string;
  priceOffer?: number;
}
