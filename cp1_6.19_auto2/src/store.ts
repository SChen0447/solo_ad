import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Card, TideEmoji, User, BottleStore } from './types';

const STORAGE_KEY = 'bottle-cards';

const TIDE_EMOJIS: TideEmoji[] = ['🐚', '⭐', '🐙', '🦀', '🐠', '🌊', '⚓', '🪸'];

const NICKNAME_PREFIXES = [
  '深海探险家', '珊瑚守护者', '海浪诗人', '星辰捕手',
  '月光潜水员', '潮汐观察者', '贝壳收藏家', '水母漫步者'
];

const SAMPLE_TITLES = [
  '用AI辅助代码审查的新思路',
  '微前端架构在大型项目中的实践',
  '设计系统如何提升团队协作效率',
  'WebAssembly在游戏开发中的应用',
  '实时协作编辑器的技术方案',
  '低代码平台的可扩展性设计',
  '前端性能优化的自动化工具链',
  'Serverless架构的成本优化策略',
  'GraphQL与REST的混合使用模式',
  '移动端首屏加载速度优化方案'
];

const SAMPLE_CONTENTS = [
  '可以考虑引入大语言模型来分析代码提交历史，识别潜在的问题模式，自动生成审查建议。这不仅能节省人力，还能发现一些人类容易忽略的细节。',
  '建议将系统拆分为独立的业务模块，每个模块独立开发、独立部署。通过模块联邦技术实现运行时集成，这样可以大大降低大型项目的维护复杂度。',
  '建立统一的设计规范和组件库，使用Figma Tokens实现设计稿到代码的自动同步。这样设计师和工程师可以使用同一种语言沟通，减少理解偏差。',
  '将核心游戏逻辑用Rust编译为WASM，在浏览器中实现接近原生的性能。JavaScript只负责UI层和渲染调用，这样既能保证性能又能利用Web生态。',
  '使用CRDT算法实现无冲突的实时协作，结合WebSocket进行增量同步。采用操作日志而非状态同步，可以大大减少网络传输量。',
  '通过可视化拖拽生成基础代码，同时保留完整的代码导出能力。设计一个插件系统，让开发者可以扩展平台能力，解决低代码平台的灵活性问题。',
  '构建自动化性能监控流水线，在CI阶段自动检测性能退化。结合Web Vitals指标，建立性能预算机制，确保性能优化的可持续性。',
  '根据访问模式动态调整函数冷启动策略，使用预热池减少冷启动时间。对长任务进行拆分，避免函数执行超时带来的额外成本。',
  '对于复杂查询使用GraphQL，对于简单CRUD操作保持REST接口。通过API网关统一管理，实现两种API风格的和谐共存。',
  '采用资源预加载、图片懒加载、代码分割等组合策略。建立性能基线和监控告警，确保优化效果不随版本迭代而退化。'
];

function generateRandomNickname(): string {
  const prefix = NICKNAME_PREFIXES[Math.floor(Math.random() * NICKNAME_PREFIXES.length)];
  const suffix = Math.floor(Math.random() * 1000);
  return `${prefix}${suffix}`;
}

function generateRandomUser(): User {
  return {
    id: uuidv4(),
    nickname: generateRandomNickname()
  };
}

function getRandomEmoji(): TideEmoji {
  return TIDE_EMOJIS[Math.floor(Math.random() * TIDE_EMOJIS.length)];
}

function generateRandomTimestamp(): number {
  const now = Date.now();
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  return now - Math.floor(Math.random() * maxAge);
}

function generateRandomCard(index: number): Card {
  const likeCount = Math.floor(Math.random() * 50);
  const dislikeCount = Math.floor(Math.random() * 20);
  const likedBy = Array.from({ length: likeCount }, () => generateRandomUser());
  const dislikedBy = Array.from({ length: dislikeCount }, () => generateRandomUser());

  return {
    id: uuidv4(),
    title: SAMPLE_TITLES[index],
    content: SAMPLE_CONTENTS[index],
    emoji: getRandomEmoji(),
    createdAt: generateRandomTimestamp(),
    likes: likeCount,
    dislikes: dislikeCount,
    likedBy,
    dislikedBy
  };
}

function loadFromStorage(): Card[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return [];
}

function saveToStorage(cards: Card[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

function initializeSeedData(): Card[] {
  const cards = Array.from({ length: 10 }, (_, i) => generateRandomCard(i));
  const sortedCards = cards.sort((a, b) => b.createdAt - a.createdAt);
  saveToStorage(sortedCards);
  return sortedCards;
}

export const useStore = create<BottleStore>((set, get) => ({
  cards: [],
  selectedCardId: null,
  isModalOpen: false,
  isMobile: false,
  showDetail: false,

  initializeData: () => {
    let cards = loadFromStorage();
    if (cards.length === 0) {
      cards = initializeSeedData();
    }
    set({ cards });
  },

  addCard: (title: string, content: string) => {
    const newCard: Card = {
      id: uuidv4(),
      title,
      content,
      emoji: getRandomEmoji(),
      createdAt: Date.now(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: []
    };
    const cards = [newCard, ...get().cards];
    saveToStorage(cards);
    set({ cards });
  },

  selectCard: (id: string | null) => {
    set({ selectedCardId: id, showDetail: id !== null });
  },

  likeCard: (id: string) => {
    const currentUser = generateRandomUser();
    const cards = get().cards.map(card => {
      if (card.id === id) {
        return {
          ...card,
          likes: card.likes + 1,
          likedBy: [...card.likedBy, currentUser]
        };
      }
      return card;
    });
    saveToStorage(cards);
    set({ cards });
  },

  dislikeCard: (id: string) => {
    const currentUser = generateRandomUser();
    const cards = get().cards.map(card => {
      if (card.id === id) {
        return {
          ...card,
          dislikes: card.dislikes + 1,
          dislikedBy: [...card.dislikedBy, currentUser]
        };
      }
      return card;
    });
    saveToStorage(cards);
    set({ cards });
  },

  toggleModal: (open: boolean) => {
    set({ isModalOpen: open });
  },

  setIsMobile: (isMobile: boolean) => {
    set({ isMobile });
  },

  setShowDetail: (show: boolean) => {
    set({ showDetail });
  },

  refreshData: () => {
    const cards = loadFromStorage();
    set({ cards });
  }
}));
