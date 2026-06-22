export interface FilterParams {
  brightness: number;
  contrast: number;
  hueRotate: number;
  saturation: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  params: FilterParams;
  thumbnail?: string;
  isBuiltIn: boolean;
  createdAt: number;
  order?: number;
}

export interface ImageItem {
  id: string;
  file: File;
  url: string;
  name: string;
  rotation: number;
  processedUrl?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
}

export interface BatchProgress {
  current: number;
  total: number;
  imageId?: string;
}

export type EventCallback<T = unknown> = (data: T) => void;

export interface EventMap {
  'FILTER_PARAMS_CHANGED': FilterParams;
  'FILTER_APPLIED': { imageId: string; dataUrl: string };
  'BATCH_PROGRESS': BatchProgress;
  'BATCH_COMPLETE': { blobs: Blob[]; names: string[] };
  'PRESET_SAVED': FilterPreset;
  'PRESET_DELETED': string;
  'PRESETS_UPDATED': FilterPreset[];
  'IMAGE_UPLOADED': ImageItem[];
  'IMAGE_ROTATED': { imageId: string; rotation: number };
  'IMAGE_REMOVED': string;
  'SELECTED_PRESET_CHANGED': string | null;
}

export const DEFAULT_PARAMS: FilterParams = {
  brightness: 0,
  contrast: 0,
  hueRotate: 0,
  saturation: 100,
};

export const BUILTIN_PRESETS: Omit<FilterPreset, 'id' | 'createdAt'>[] = [
  {
    name: '复古暖黄',
    params: { brightness: 10, contrast: 15, hueRotate: 25, saturation: 85 },
    isBuiltIn: true,
  },
  {
    name: '冷白调',
    params: { brightness: 15, contrast: 5, hueRotate: 210, saturation: 70 },
    isBuiltIn: true,
  },
  {
    name: '日系清新',
    params: { brightness: 20, contrast: -10, hueRotate: 180, saturation: 60 },
    isBuiltIn: true,
  },
  {
    name: '高对比黑白',
    params: { brightness: 0, contrast: 40, hueRotate: 0, saturation: 0 },
    isBuiltIn: true,
  },
  {
    name: '胶片颗粒',
    params: { brightness: 5, contrast: 20, hueRotate: 15, saturation: 110 },
    isBuiltIn: true,
  },
];

export const STORAGE_KEY = 'pailidiao_presets';
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGES = 10;
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
