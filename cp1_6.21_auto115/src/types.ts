export type RoastLevel = 'light' | 'medium' | 'dark';

export type FlavorTag = 'floral' | 'fruity' | 'nutty' | 'chocolate' | 'caramel' | 'spicy';

export interface FlavorEval {
  acidity: number;
  sweetness: number;
  bitterness: number;
  body: number;
  flavorTags: FlavorTag[];
  overallScore: number;
}

export interface BrewRecord {
  id: string;
  recordNumber: number;
  coffeeName: string;
  roastLevel: RoastLevel;
  grindSize: number;
  waterTemp: number;
  ratio: number;
  totalTime: number;
  createdAt: string;
  flavorEval?: FlavorEval;
}

export interface Weights {
  acidity: number;
  sweetness: number;
  bitterness: number;
  body: number;
}

export const FLAVOR_TAG_LABELS: Record<FlavorTag, string> = {
  floral: '花香',
  fruity: '果香',
  nutty: '坚果',
  chocolate: '巧克力',
  caramel: '焦糖',
  spicy: '香料',
};

export const ROAST_LABELS: Record<RoastLevel, string> = {
  light: '浅烘',
  medium: '中烘',
  dark: '深烘',
};

export const COFFEE_COLORS: Record<string, string> = {
  '埃塞俄比亚': '#E67E22',
  '哥伦比亚': '#3498DB',
  '肯尼亚': '#9B59B6',
  '巴西': '#27AE60',
  '危地马拉': '#E74C3C',
  '曼特宁': '#1ABC9C',
  '耶加雪菲': '#F39C12',
  '瑰夏': '#8E44AD',
  'default': '#95A5A6',
};
