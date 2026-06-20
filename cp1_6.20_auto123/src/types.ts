export interface GPSCoord {
  latitude: number;
  longitude: number;
}

export interface Photo {
  id: string;
  filename: string;
  url: string;
  originalName: string;
  gps: GPSCoord | null;
  hasGps: boolean;
  capturedAt: string;
  tags: string[];
  device: string;
  focalLength: string;
  aperture: string;
  iso: string;
  uploadedAt: string;
  distance?: number;
}

export interface PhotoDetail extends Photo {
  nearby: Photo[];
}

export interface UploadTask {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  photo?: Photo;
}

export interface FilterState {
  month: number | null;
  tag: string;
}
