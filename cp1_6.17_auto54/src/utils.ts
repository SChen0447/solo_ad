export interface Theme {
  name: string;
  primary: string;
  secondary: string;
  colors: string[];
  bg: string;
  text: string;
  cardBg: string;
}

export interface FontOption {
  name: string;
  value: string;
}

export interface ChartData {
  lineData: { name: string; value: number; value2?: number }[];
  barData: { name: string; value: number; value2?: number }[];
  pieData: { name: string; value: number }[];
  radarData: { subject: string; A: number; B: number }[];
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'radar';
  showLabel: boolean;
  yAxisAuto: boolean;
  yAxisMin?: number;
  yAxisMax?: number;
  smoothCurve?: boolean;
}

export const themes: Theme[] = [
  {
    name: '暗黑霓虹',
    primary: '#ff00ff',
    secondary: '#00ffff',
    colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff6600', '#00ff66'],
    bg: '#1a1a2e',
    text: '#ffffff',
    cardBg: '#16213e'
  },
  {
    name: '清新森林',
    primary: '#2d6a4f',
    secondary: '#52b788',
    colors: ['#2d6a4f', '#52b788', '#95d5b2', '#40916c', '#74c69d'],
    bg: '#f8f9fa',
    text: '#212529',
    cardBg: '#ffffff'
  },
  {
    name: '极简灰蓝',
    primary: '#4a5568',
    secondary: '#63b3ed',
    colors: ['#4a5568', '#63b3ed', '#718096', '#90cdf4', '#a0aec0'],
    bg: '#f7fafc',
    text: '#2d3748',
    cardBg: '#ffffff'
  },
  {
    name: '暖阳珊瑚',
    primary: '#e85d75',
    secondary: '#f4a261',
    colors: ['#e85d75', '#f4a261', '#e9c46a', '#ef8354', '#f6bd60'],
    bg: '#fff8f0',
    text: '#3d2828',
    cardBg: '#ffffff'
  },
  {
    name: '科幻紫晶',
    primary: '#667eea',
    secondary: '#764ba2',
    colors: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'],
    bg: '#0f0c29',
    text: '#ffffff',
    cardBg: '#1a1735'
  }
];

export const fonts: FontOption[] = [
  { name: 'Roboto (现代无衬线)', value: "'Roboto', sans-serif" },
  { name: 'Noto Sans SC (中文友好)', value: "'Noto Sans SC', sans-serif" },
  { name: 'Playfair Display (优雅衬线)', value: "'Playfair Display', serif" }
];

export const generateDefaultData = (): ChartData => {
  return {
    lineData: [
      { name: '1月', value: 400, value2: 240 },
      { name: '2月', value: 300, value2: 139 },
      { name: '3月', value: 520, value2: 380 },
      { name: '4月', value: 278, value2: 390 },
      { name: '5月', value: 689, value2: 480 },
      { name: '6月', value: 439, value2: 380 },
      { name: '7月', value: 720, value2: 520 }
    ],
    barData: [
      { name: '产品A', value: 4000, value2: 2400 },
      { name: '产品B', value: 3000, value2: 1390 },
      { name: '产品C', value: 2000, value2: 980 },
      { name: '产品D', value: 2780, value2: 3900 },
      { name: '产品E', value: 1890, value2: 4800 }
    ],
    pieData: [
      { name: '直接访问', value: 435 },
      { name: '搜索引擎', value: 310 },
      { name: '邮件营销', value: 234 },
      { name: '联盟广告', value: 135 },
      { name: '视频广告', value: 1548 }
    ],
    radarData: [
      { subject: '销售', A: 120, B: 110 },
      { subject: '市场', A: 98, B: 130 },
      { subject: '研发', A: 86, B: 130 },
      { subject: '客服', A: 99, B: 100 },
      { subject: '运营', A: 85, B: 90 },
      { subject: '财务', A: 65, B: 85 }
    ]
  };
};

export const defaultChartConfigs: Record<string, ChartConfig> = {
  chart1: { type: 'line', showLabel: true, yAxisAuto: true, smoothCurve: true },
  chart2: { type: 'bar', showLabel: true, yAxisAuto: true },
  chart3: { type: 'pie', showLabel: true, yAxisAuto: true },
  chart4: { type: 'radar', showLabel: true, yAxisAuto: true }
};

export const chartNames: Record<string, string> = {
  chart1: '销售趋势',
  chart2: '产品对比',
  chart3: '流量来源',
  chart4: '部门绩效'
};
