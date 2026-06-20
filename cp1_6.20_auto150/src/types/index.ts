export interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  target: 'A' | 'B';
}

export interface ImageData {
  url: string;
  title: string;
  width: number;
  height: number;
}

export interface UploadResponse {
  success: boolean;
  url: string;
}

export interface ReportData {
  imageA: ImageData;
  imageB: ImageData;
  annotations: Annotation[];
}
