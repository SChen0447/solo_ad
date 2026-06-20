export type MarketPosition = '技术创新' | '消费升级' | '产业互联' | '社会公益';

export interface PlanFormData {
  projectName: string;
  vision: string;
  marketPosition: MarketPosition;
  targetUsers: string[];
}

export interface FinanceParams {
  initialInvestment: number;
  monthlyFixedCost: number;
  monthlyGrowthRate: number;
}

export interface PlanBookData {
  projectName: string;
  vision: string;
  marketPosition: MarketPosition;
  targetUsers: string[];
  chapters: Chapter[];
  financeParams: FinanceParams;
}

export interface Chapter {
  title: string;
  content: string;
}

export const MARKET_POSITION_CONFIG: Record<MarketPosition, { color: string; bg: string }> = {
  '技术创新': { color: '#3b82f6', bg: '#eff6ff' },
  '消费升级': { color: '#f59e0b', bg: '#fffbeb' },
  '产业互联': { color: '#22c55e', bg: '#f0fdf4' },
  '社会公益': { color: '#ef4444', bg: '#fef2f2' },
};

export const TARGET_USER_OPTIONS = [
  'Z世代',
  '职场白领',
  '中小企业',
  '自由职业者',
  '家庭主妇',
  '银发族',
  '学生群体',
  '新市民',
];

export const MARKET_POSITION_OPTIONS: MarketPosition[] = ['技术创新', '消费升级', '产业互联', '社会公益'];
