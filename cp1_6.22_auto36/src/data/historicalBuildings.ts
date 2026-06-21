export type BuildingStyle = 'greek' | 'gothic' | 'baroque' | 'modern';

export interface BuildingData {
  id: BuildingStyle;
  name: string;
  nameEn: string;
  icon: string;
  primaryColor: string;
  period: string;
  startYear: number;
  endYear: number;
  description: string;
  features: string[];
  structuralElements: string[];
  decorativeElements: string[];
}

export interface TimelineEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  icon: string;
  buildingStyle: BuildingStyle;
}

export const BUILDINGS: BuildingData[] = [
  {
    id: 'greek',
    name: '古希腊神庙',
    nameEn: 'Greek Temple',
    icon: '🏛️',
    primaryColor: '#E8C07D',
    period: '公元前800年 - 公元前146年',
    startYear: -500,
    endYear: -146,
    description: '以柱式体系为核心，追求比例和谐与几何秩序',
    features: ['多立克柱式', '爱奥尼柱式', '科林斯柱式', '三角楣饰', '柱廊设计'],
    structuralElements: ['柱身', '额枋', '台基'],
    decorativeElements: ['三角楣浮雕', '檐部装饰', '柱头涡卷']
  },
  {
    id: 'gothic',
    name: '哥特式教堂',
    nameEn: 'Gothic Cathedral',
    icon: '⛪',
    primaryColor: '#8B9DC3',
    period: '12世纪 - 16世纪',
    startYear: 1140,
    endYear: 1500,
    description: '尖拱与飞扶壁塑造垂直向上的神圣空间感',
    features: ['尖拱券', '飞扶壁', '肋拱穹顶', '彩色玻璃窗', '玫瑰花窗'],
    structuralElements: ['飞扶壁', '肋拱', '束柱', '尖拱'],
    decorativeElements: ['玫瑰花窗', '浮雕装饰', '尖顶饰']
  },
  {
    id: 'baroque',
    name: '巴洛克宫殿',
    nameEn: 'Baroque Palace',
    icon: '🏰',
    primaryColor: '#D4A574',
    period: '17世纪 - 18世纪中叶',
    startYear: 1600,
    endYear: 1750,
    description: '戏剧性曲线与繁复装饰彰显皇家气势',
    features: ['曲面立面', '椭圆形空间', '镀金装饰', '透视壁画', '戏剧性光影'],
    structuralElements: ['拱券结构', '穹顶鼓座'],
    decorativeElements: ['石膏浮雕', '镀金饰带', '壁画穹顶']
  },
  {
    id: 'modern',
    name: '现代主义建筑',
    nameEn: 'Modernist Building',
    icon: '🏢',
    primaryColor: '#7EC8E3',
    period: '20世纪初 - 至今',
    startYear: 1920,
    endYear: 2024,
    description: '形式追随功能，玻璃与钢结构的纯粹表达',
    features: ['玻璃幕墙', '钢结构', '开放式平面', '极简装饰', '功能主义'],
    structuralElements: ['钢框架', '玻璃幕墙', '楼板结构'],
    decorativeElements: ['金属线条', '光影效果', '材质对比']
  }
];

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'parthenon',
    year: -438,
    title: '帕特农神庙建成',
    description: '雅典卫城的帕特农神庙竣工，代表古希腊建筑巅峰之作，采用多立克柱式。',
    icon: '🏛️',
    buildingStyle: 'greek'
  },
  {
    id: 'pantheon',
    year: 126,
    title: '罗马万神殿重建',
    description: '哈德良皇帝时期重建万神殿，其巨大穹顶展现古罗马混凝土工程奇迹。',
    icon: '🏛️',
    buildingStyle: 'greek'
  },
  {
    id: 'notre-dame-start',
    year: 1163,
    title: '巴黎圣母院开工',
    description: '巴黎圣母院大教堂开始建造，哥特式建筑的典范之作。',
    icon: '⛪',
    buildingStyle: 'gothic'
  },
  {
    id: 'chartres',
    year: 1220,
    title: '沙特尔大教堂完工',
    description: '法国沙特尔大教堂完工，以其精美彩色玻璃和飞扶壁著称。',
    icon: '⛪',
    buildingStyle: 'gothic'
  },
  {
    id: 'notre-dame-finish',
    year: 1345,
    title: '巴黎圣母院完工',
    description: '历经近两个世纪，巴黎圣母院正式完工。',
    icon: '⛪',
    buildingStyle: 'gothic'
  },
  {
    id: 'st-peters',
    year: 1626,
    title: '圣彼得大教堂落成',
    description: '梵蒂冈圣彼得大教堂正式落成，巴洛克风格的巅峰代表。',
    icon: '⛪',
    buildingStyle: 'baroque'
  },
  {
    id: 'palace-versailles',
    year: 1682,
    title: '凡尔赛宫扩建完成',
    description: '路易十四时期凡尔赛宫扩建完成，巴洛克宫殿艺术极致。',
    icon: '🏰',
    buildingStyle: 'baroque'
  },
  {
    id: 'bauhaus',
    year: 1919,
    title: '包豪斯学院成立',
    description: '德国魏玛包豪斯学院成立，现代主义建筑运动开端。',
    icon: '🏫',
    buildingStyle: 'modern'
  },
  {
    id: 'seagram',
    year: 1958,
    title: '西格拉姆大厦建成',
    description: '纽约西格拉姆大厦落成，密斯·凡德罗国际风格代表作品。',
    icon: '🏢',
    buildingStyle: 'modern'
  },
  {
    id: 'sydney-opera',
    year: 1973,
    title: '悉尼歌剧院落成',
    description: '悉尼歌剧院正式开放，约恩·乌松设计，现代建筑杰作。',
    icon: '🎭',
    buildingStyle: 'modern'
  },
  {
    id: 'burj-khalifa',
    year: 2010,
    title: '哈利法塔竣工',
    description: '迪拜哈利法塔落成，世界最高建筑，828米。',
    icon: '🗼',
    buildingStyle: 'modern'
  }
];

export const HIGHLIGHT_MODES = ['none', 'structure', 'decoration'] as const;
export type HighlightMode = typeof HIGHLIGHT_MODES[number];

export function getBuildingById(id: BuildingStyle): BuildingData | undefined {
  return BUILDINGS.find(b => b.id === id);
}

export function getEventsForYear(year: number): TimelineEvent | undefined {
  let closest: TimelineEvent | undefined;
  let minDiff = Infinity;
  for (const event of TIMELINE_EVENTS) {
    const diff = Math.abs(event.year - year);
    if (diff < minDiff) {
      minDiff = diff;
      closest = event;
    }
  }
  return closest;
}

export function yearToPercent(year: number): number {
  const min = -500;
  const max = 2024;
  return ((year - min) / (max - min)) * 100;
}

export function percentToYear(percent: number): number {
  const min = -500;
  const max = 2024;
  return Math.round(min + (percent / 100) * (max - min));
}
