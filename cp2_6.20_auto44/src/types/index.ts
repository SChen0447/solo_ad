export type StyleType = 'watercolor' | 'oil' | 'sketch' | 'pixel' | 'impressionism';

export interface StyleParams {
  style: StyleType;
  intensity: number;
  contrast: number;
  detailLevel: number;
}

export interface UploadResponse {
  success: boolean;
  imageId: string;
  originalUrl: string;
}

export interface StyleResponse {
  success: boolean;
  processedImage: string;
}

export interface ShareResponse {
  success: boolean;
  shareUrl: string;
  expiresAt: number;
}

export interface StyleOption {
  id: StyleType;
  name: string;
  thumbnail: string;
}
