export interface Layer {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  opacity: number;
  commercialUse: boolean;
  resellAllowed: boolean;
  price: number;
  width: number;
  height: number;
  imageBase64: string;
  children?: Layer[];
}

export interface Work {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  resolution: string;
  dimensions: string;
  commercialUse: boolean;
  layers: Layer[];
  createdAt: string;
}

export interface WorkListItem {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  commercialUse: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  workId: string;
  workTitle: string;
  workThumbnail: string;
  buyerId: string;
  buyerName: string;
  purchaseType: 'full' | 'single_layer';
  layerId?: string;
  layerName?: string;
  price: number;
  transactionTime: string;
  certificateHash: string;
  licenseType: 'personal' | 'commercial' | 'unlimited';
}

export interface PurchaseRequest {
  workId: string;
  purchaseType: 'full' | 'single_layer';
  layerId?: string;
  paymentMethod: 'alipay' | 'wechat';
  buyerId: string;
  buyerName: string;
}

export interface PurchaseResponse {
  success: boolean;
  order: Order;
  downloadUrl?: string;
}
