export interface Product {
  id: string;
  name: string;
  originalPrice: number;
  discountPrice: number;
  stock: number;
  mainImageUrl: string;
  description: string;
}

export type TemplateId = 'vertical' | 'horizontal' | 'grid';

export interface ActivityConfig {
  activityName: string;
  startTime: string;
  endTime: string;
  discountColor: string;
}

export interface PromotionState {
  availableProducts: Product[];
  selectedProducts: Product[];
  templateId: TemplateId;
  activityConfig: ActivityConfig;
  setSelectedProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  reorderProducts: (fromIndex: number, toIndex: number) => void;
  setTemplateId: (templateId: TemplateId) => void;
  updateActivityConfig: (config: Partial<ActivityConfig>) => void;
}

export interface PublishResponse {
  success: boolean;
  promotionId: string;
  shareUrl: string;
}
