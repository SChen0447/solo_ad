export interface Material {
  id: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  materialId: string;
  title: string;
  platform: PlatformType;
  publishDate: string;
  status: ScheduleStatus;
  coverImage: string;
  order: number;
}

export type PlatformType = 'weibo' | 'xiaohongshu' | 'wechat';
export type ScheduleStatus = 'draft' | 'scheduled' | 'published';

export interface PlatformValidation {
  platform: PlatformType;
  valid: boolean;
  titleOverflow: number;
  contentOverflow: number;
  titleLimit: number;
  contentLimit: number;
  truncateRisk: boolean;
}

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
