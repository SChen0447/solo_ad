export interface MusicResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  genre: string;
}

export interface UploadedMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  filename: string;
  size: number;
}

export interface DiaryEntry {
  id: string;
  date: string;
  text: string;
  musicInfo: MusicResult | null;
  mediaPaths: UploadedMedia[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiaryRequest {
  date: string;
  text: string;
  musicInfo: MusicResult | null;
  mediaPaths: UploadedMedia[];
}

export interface SearchDiaryRequest {
  keyword: string;
  year?: number;
  month?: number;
}

export interface MonthGroup {
  year: number;
  month: number;
  entries: DiaryEntry[];
}

export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}
