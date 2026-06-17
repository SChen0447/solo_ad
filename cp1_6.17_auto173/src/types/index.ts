export interface Flower {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
  color: string;
}

export interface BouquetFlower extends Flower {
  instanceId: string;
  position: { x: number; y: number };
  rotation: number;
  scale: number;
}

export interface Order {
  id?: number;
  orderNo: string;
  flowers: BouquetFlower[];
  packaging: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: string;
}

export interface PackagingStyle {
  id: string;
  name: string;
  price: number;
  description: string;
}

export type PageRoute = 'editor' | 'checkout' | 'order-detail' | 'admin';
