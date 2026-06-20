export interface StoryRecord {
  id: string;
  title: string;
  content: string;
  theme: string;
  keywords: string[];
  createdAt: number;
}

export interface SceneData {
  terrain: string[];
  buildings: string[];
  weather: string;
  timeOfDay: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  gradient: string;
  prefix: string;
  icon: string;
}

export const THEMES: ThemeConfig[] = [
  { id: 'scifi', name: '科幻', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', prefix: '在未来的科幻世界中，', icon: '🚀' },
  { id: 'fantasy', name: '奇幻', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', prefix: '在充满魔法的奇幻大陆上，', icon: '🔮' },
  { id: 'adventure', name: '冒险', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', prefix: '在未知的冒险旅途中，', icon: '⚔️' },
  { id: 'campus', name: '校园', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', prefix: '在青春的校园里，', icon: '📚' },
  { id: 'mystery', name: '悬疑', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', prefix: '在扑朔迷离的迷案中，', icon: '🔍' },
  { id: 'ancient', name: '古风', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', prefix: '在古色古香的岁月里，', icon: '🏮' },
];

export const KEYWORD_MAP: Record<string, { terrain: string[]; buildings: string[]; weather: string }> = {
  '科幻': { terrain: ['metal', 'neon'], buildings: ['tower', 'dome'], weather: 'rain' },
  '奇幻': { terrain: ['grass', 'mountain'], buildings: ['castle'], weather: 'sun' },
  '冒险': { terrain: ['mountain', 'river'], buildings: ['hut'], weather: 'sun' },
  '校园': { terrain: ['grass'], buildings: ['tower'], weather: 'sun' },
  '悬疑': { terrain: ['mountain', 'river'], buildings: ['hut', 'castle'], weather: 'rain' },
  '古风': { terrain: ['mountain', 'river'], buildings: ['hut', 'tower'], weather: 'snow' },
};

const KEYWORD_TERRAIN_MAP: Record<string, string[]> = {
  '草地': ['grass'], '草原': ['grass'], '森林': ['grass', 'mountain'],
  '山脉': ['mountain'], '山': ['mountain'], '高山': ['mountain'],
  '河流': ['river'], '河': ['river'], '溪流': ['river'], '湖': ['river'],
  '海': ['river'], '沙漠': ['mountain'],
};

const KEYWORD_BUILDING_MAP: Record<string, string[]> = {
  '小屋': ['hut'], '房屋': ['hut'], '家': ['hut'], '客栈': ['hut'],
  '城堡': ['castle'], '宫殿': ['castle'], '王宫': ['castle'],
  '塔楼': ['tower'], '塔': ['tower'], '高楼': ['tower'], '大厦': ['tower'],
  '学校': ['tower'], '图书馆': ['tower'],
};

const KEYWORD_WEATHER_MAP: Record<string, string> = {
  '雨': 'rain', '雨滴': 'rain', '暴风雨': 'rain', '雷': 'rain',
  '雪': 'snow', '雪花': 'snow', '冰': 'snow', '寒': 'snow',
  '阳光': 'sun', '晴天': 'sun', '光': 'sun', '温暖': 'sun',
};

export function parseKeywords(text: string, theme: string): SceneData {
  const terrain: string[] = [];
  const buildings: string[] = [];
  let weather = 'sun';

  const themeData = KEYWORD_MAP[theme];
  if (themeData) {
    terrain.push(...themeData.terrain);
    buildings.push(...themeData.buildings);
    weather = themeData.weather;
  }

  for (const [keyword, values] of Object.entries(KEYWORD_TERRAIN_MAP)) {
    if (text.includes(keyword)) {
      terrain.push(...values);
    }
  }

  for (const [keyword, values] of Object.entries(KEYWORD_BUILDING_MAP)) {
    if (text.includes(keyword)) {
      buildings.push(...values);
    }
  }

  for (const [keyword, value] of Object.entries(KEYWORD_WEATHER_MAP)) {
    if (text.includes(keyword)) {
      weather = value;
    }
  }

  return {
    terrain: [...new Set(terrain)],
    buildings: [...new Set(buildings)],
    weather,
    timeOfDay: 'day',
  };
}
