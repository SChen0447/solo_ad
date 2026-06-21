import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

export interface PortfolioItem {
  id: string;
  title: string;
  coverImage: string;
  createdAt: string;
  tools: string[];
  description: string;
  category: 'digital' | 'traditional' | 'mixed';
}

export interface Inquiry {
  id: string;
  inquiryNumber: string;
  name: string;
  email: string;
  requirements: string;
  budgetRange: string;
  timeline: string;
  status: 'unread' | 'read' | 'quoted' | 'accepted' | 'rejected';
  createdAt: string;
  portfolioId?: string;
}

export interface Quote {
  id: string;
  inquiryId: string;
  price: number;
  deliveryTime: string;
  description: string;
  createdAt: string;
}

interface DataStore {
  portfolio: PortfolioItem[];
  inquiries: Inquiry[];
  quotes: Quote[];
}

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const getDataPath = (): string => {
  return path.join(DATA_DIR, 'data.json');
};

export const readData = (): DataStore => {
  ensureDataDir();
  const dataPath = getDataPath();
  if (!fs.existsSync(dataPath)) {
    const initialData: DataStore = {
      portfolio: getInitialPortfolio(),
      inquiries: [],
      quotes: [],
    };
    writeData(initialData);
    return initialData;
  }
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(rawData);
};

export const writeData = (data: DataStore): void => {
  ensureDataDir();
  const dataPath = getDataPath();
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
};

const getInitialPortfolio = (): PortfolioItem[] => {
  const tools = {
    digital: ['Procreate', 'Photoshop', 'Illustrator', 'Clip Studio Paint'],
    traditional: ['水彩', '丙烯', '素描铅笔', '色粉笔'],
    mixed: ['水彩+Procreate', '丙烯+Photoshop', '混合媒介'],
  };

  const titles = [
    '山间晨雾', '城市之夜', '梦幻花园', '海洋深处',
    '秋日私语', '星空漫步', '古城记忆', '花之韵',
    '人物肖像', '风景速写', '概念设计', '角色设定',
    '商业插画', '书籍封面', '海报设计', '品牌插画',
    '儿童绘本', '科幻场景', '奇幻生物', '日常小品',
    '春日樱花', '夏日海滩', '冬日雪景', '美食插画',
  ];

  const descriptions = [
    '探索自然与人文的交融，用柔和的笔触描绘生活中的美好瞬间。',
    '以独特的视角展现城市的繁华与宁静，光影交错间流露情感。',
    '融合东方美学与现代设计语言，创造富有诗意的视觉体验。',
    '通过色彩与形态的实验，表达内心深处的情感与思考。',
  ];

  const categories: ('digital' | 'traditional' | 'mixed')[] = ['digital', 'traditional', 'mixed'];

  return titles.map((title, index) => {
    const category = categories[index % 3];
    const toolList = tools[category];
    const height = 200 + (index % 5) * 80;
    return {
      id: `portfolio-${index + 1}`,
      title,
      coverImage: `https://picsum.photos/seed/art${index + 1}/400/${height}`,
      createdAt: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
      tools: [toolList[index % toolList.length], toolList[(index + 1) % toolList.length]],
      description: descriptions[index % descriptions.length],
      category,
    };
  });
};
