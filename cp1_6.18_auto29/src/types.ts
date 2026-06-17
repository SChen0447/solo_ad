export type TagColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export interface Inspiration {
  id: string;
  content: string;
  tag: TagColor;
  x: number;
  y: number;
  createdAt: string;
  links: string[];
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export const TAG_COLORS: Record<TagColor, { bg: string; glow: string; name: string }> = {
  red: { bg: '#e94560', glow: 'rgba(233, 69, 96, 0.5)', name: '红色' },
  orange: { bg: '#f39c12', glow: 'rgba(243, 156, 18, 0.5)', name: '橙色' },
  yellow: { bg: '#f1c40f', glow: 'rgba(241, 196, 15, 0.5)', name: '黄色' },
  green: { bg: '#2ecc71', glow: 'rgba(46, 204, 113, 0.5)', name: '绿色' },
  blue: { bg: '#3498db', glow: 'rgba(52, 152, 219, 0.5)', name: '蓝色' },
  purple: { bg: '#9b59b6', glow: 'rgba(155, 89, 182, 0.5)', name: '紫色' }
};
