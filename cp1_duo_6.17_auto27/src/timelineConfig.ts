import type { EventType } from './types';

export interface EventTypeConfig {
  color: string;
  label: string;
  lightColor: string;
}

export const EVENT_TYPE_CONFIG: Record<EventType, EventTypeConfig> = {
  main: {
    color: '#F59E0B',
    lightColor: 'rgba(245, 158, 11, 0.15)',
    label: '主线剧情',
  },
  side: {
    color: '#10B981',
    lightColor: 'rgba(16, 185, 129, 0.15)',
    label: '支线剧情',
  },
  memory: {
    color: '#8B5CF6',
    lightColor: 'rgba(139, 92, 246, 0.15)',
    label: '回忆',
  },
  foreshadow: {
    color: '#EC4899',
    lightColor: 'rgba(236, 72, 153, 0.15)',
    label: '伏笔',
  },
};

export const TIMELINE_SCALES = [
  { key: 'year', label: '年', zoomRange: [0.3, 0.7] },
  { key: 'season', label: '季', zoomRange: [0.7, 1.2] },
  { key: 'month', label: '月', zoomRange: [1.2, 2.5] },
  { key: 'day', label: '日', zoomRange: [2.5, 5] },
] as const;

export type TimelineScaleKey = typeof TIMELINE_SCALES[number]['key'];

export const TIMELINE_ZOOM_MIN = TIMELINE_SCALES[0].zoomRange[0];
export const TIMELINE_ZOOM_MAX = TIMELINE_SCALES[TIMELINE_SCALES.length - 1].zoomRange[1];

export const getScaleKeyByZoom = (zoom: number): TimelineScaleKey => {
  for (const scale of TIMELINE_SCALES) {
    if (zoom >= scale.zoomRange[0] && zoom < scale.zoomRange[1]) {
      return scale.key;
    }
  }
  if (zoom < TIMELINE_ZOOM_MIN) return TIMELINE_SCALES[0].key;
  return TIMELINE_SCALES[TIMELINE_SCALES.length - 1].key;
};

export const getScaleLabelByZoom = (zoom: number): string => {
  const key = getScaleKeyByZoom(zoom);
  return TIMELINE_SCALES.find(s => s.key === key)?.label || '年';
};
