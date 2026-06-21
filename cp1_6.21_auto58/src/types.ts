export type Platform = 'douyin' | 'bilibili' | 'xiaohongshu' | 'weixin';

export type VideoStatus = 'pending' | 'published' | 'delayed';

export type ViewMode = 'projects' | 'calendar' | 'stats';

export type CalendarMode = 'month' | 'day';

export interface Project {
  id: string;
  name: string;
  platforms: Platform[];
  colorTag: string;
  startDate: string;
  endDate: string;
  createdAt: number;
}

export interface VideoEntry {
  id: string;
  projectId: string;
  title: string;
  plannedTime: string;
  duration: number;
  materialLinks: string[];
  status: VideoStatus;
  sortOrder: number;
  createdAt: number;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  douyin: '抖音',
  bilibili: 'B站',
  xiaohongshu: '小红书',
  weixin: '视频号',
};

export const STATUS_LABELS: Record<VideoStatus, string> = {
  pending: '待发布',
  published: '已发布',
  delayed: '已延期',
};

export const COLOR_PALETTE = [
  { value: '#f87171', label: '珊瑚红' },
  { value: '#fb923c', label: '琥珀橙' },
  { value: '#fbbf24', label: '向日葵黄' },
  { value: '#a3e635', label: '青柠绿' },
  { value: '#34d399', label: '薄荷绿' },
  { value: '#22d3ee', label: '天际蓝' },
  { value: '#60a5fa', label: '矢车菊蓝' },
  { value: '#818cf8', label: '薰衣草紫' },
  { value: '#a78bfa', label: '紫罗兰' },
  { value: '#e879f9', label: '兰花粉' },
  { value: '#f472b6', label: '玫瑰粉' },
  { value: '#94a3b8', label: '石板灰' },
];
