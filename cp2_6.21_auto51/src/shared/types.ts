export interface Work {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
}

export interface MaterialPack {
  id: string;
  name: string;
  price: number;
  components: string[];
  tagList: string[];
}

export type OrderStatus = '已提交' | '已发货' | '已完成';

export interface Order {
  id: string;
  materialPackId: string;
  materialPackName: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  createdAt: string;
}

export interface MaterialRecommendation extends MaterialPack {
  matchScore: number;
}
