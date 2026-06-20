export interface ImageItem {
  id: string;
  name: string;
  url: string;
  stepName: string;
  order: number;
}

export interface ProcessResult {
  success: boolean;
  images: ImageItem[];
  errors: string[];
}
