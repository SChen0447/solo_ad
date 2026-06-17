export type ComponentType = 'button' | 'icon' | 'card' | 'input' | 'label';

export interface Component {
  id: string;
  type: ComponentType;
  color: string;
  width: number;
  height: number;
  borderRadius: number;
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  filename: string;
  width: number;
  height: number;
}

export interface ExtractResponse {
  success: boolean;
  component: Component;
}

export interface SaveResponse {
  success: boolean;
  annotationId: string;
  componentCount: number;
}

export interface ExportData {
  components: Component[];
}

export interface ImageInfo {
  fileId: string;
  filename: string;
  width: number;
  height: number;
  url: string;
}
