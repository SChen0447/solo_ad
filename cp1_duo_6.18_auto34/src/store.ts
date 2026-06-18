import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Bottle, User, VoteType } from './types';

const TIDE_EMOJIS = ['🐚', '⭐', '🌀', '🌊', '🐙', '🦀', '🦑', '🐡', '🦐', '🐟', '🪸', '🌴', '⛵', '🏝️', '⚓'];

const NICKNAME_PREFIXES = [
  '深海探险家', '珊瑚守护者', '海洋诗人', '潮汐漫步者', '浪花收集者',
  '月光潜水员', '星尘航海家', '贝壳拾荒者', '蓝海漫游者', '鲸歌聆听者',
  '水母舞者', '海马骑士', '海星梦想家', '海底考古学家', '珍珠猎人'
];

const SEED_TITLES = [
  '引入AI代码审查机器人',
  '每周五下午举办创意黑客松',
  '建立内部开源贡献奖励机制',
  '创建团队知识库自动整理工具',
  '尝试结对编程轮换制度',
  '开发可视化项目进度大屏',
  '建立匿名吐槽反馈箱',
  '每月组织技术分享午餐会',
  '引入游戏化KPI积分系统',
  '打造远程协作虚拟办公室'
];

const SEED_CONTENTS = [
  '通过接入GPT模型，在每次提交PR时自动进行代码质量分析，找出潜在bug和性能问题，给出改进建议，节省团队review时间。',
  '让大家用半天时间自由探索感兴趣的技术或做小项目原型，优秀创意可以申请资源落地，激发团队创新活力。',
  '对提交有价值PR的成员给予积分奖励，积分可兑换礼品或假期，促进知识共享和代码质量提升。',
  '使用NLP技术自动整理会议纪要、设计文档，生成可搜索的知识图谱，新人入职能快速了解历史决策。',
  '每天固定时间段，两人共用一台电脑写代码，增加知识传递，减少单点依赖，同时增进团队默契。',
  '在办公区放置大屏幕，实时展示各项目燃尽图、部署状态、代码提交热力图，增加信息透明度。',
  '一个可以匿名提交意见和建议的渠道，每月整理讨论，改善团队协作氛围和流程痛点。',
  '轮流主讲，边吃外卖边听分享，内容可以是技术、产品、设计甚至兴趣爱好，增进跨组交流。',
  '完成任务获得经验值升级，解锁成就徽章，登上排行榜，用游戏化方式让日常工作更有动力。',
  '为远程办公成员创建3D虚拟办公室，有虚拟工位、会议室、茶水间，模拟线下协作的社交感。'
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNickname(): string {
  const prefix = NICKNAME_PREFIXES[randomInt(0, NICKNAME_PREFIXES.length - 1)];
  const suffix = randomInt(100, 999);
  return `${prefix}${suffix}`;
}

function generateUser(): User {
  return {
    id: uuidv4(),
    nickname: generateNickname()
  };
}

function generateEmoji(): string {
  return TIDE_EMOJIS[randomInt(0, TIDE_EMOJIS.length - 1)];
}

function generateLikeUsers(count: number): User[] {
  const users: User[] = [];
  for (let i = 0; i < count; i++) {
    users.push(generateUser());
  }
  return users;
}

function generateSeedBottles(): Bottle[] {
  const bottles: Bottle[] = [];
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    const likes = randomInt(0, 25);
    const likeUsers = generateLikeUsers(likes);
    bottles.push({
      id: uuidv4(),
      title: SEED_TITLES[i],
      content: SEED_CONTENTS[i],
      createdAt: now - randomInt(1, 4320) * 60 * 1000,
      emoji: generateEmoji(),
      likes,
      dislikes: randomInt(0, 8),
      likeUsers,
      authorId: uuidv4(),
      authorName: generateNickname()
    });
  }

  return bottles.sort((a, b) => b.createdAt - a.createdAt);
}

const STORAGE_KEY = 'drift-bottles-data';
const SELECTED_KEY = 'drift-bottles-selected';

function loadFromStorage(): Bottle[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Bottle[];
    if (!Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}

function saveToStorage(bottles: Bottle[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bottles));
  } catch {
    /* ignore */
  }
}

export interface BottleState {
  bottles: Bottle[];
  selectedId: string | null;
  isModalOpen: boolean;
  lastRefresh: number;

  init: () => void;
  addBottle: (title: string, content: string) => void;
  vote: (bottleId: string, type: VoteType) => void;
  selectBottle: (id: string | null) => void;
  setModalOpen: (open: boolean) => void;
  refreshPoll: () => void;
}

export const useStore = create<BottleState>((set, get) => ({
  bottles: [],
  selectedId: null,
  isModalOpen: false,
  lastRefresh: Date.now(),

  init: () => {
    const stored = loadFromStorage();
    if (stored && stored.length > 0) {
      const savedSelected = localStorage.getItem(SELECTED_KEY);
      set({
        bottles: stored.sort((a, b) => b.createdAt - a.createdAt),
        selectedId: savedSelected,
        lastRefresh: Date.now()
      });
    } else {
      const seeds = generateSeedBottles();
      saveToStorage(seeds);
      set({
        bottles: seeds,
        selectedId: seeds[0]?.id ?? null,
        lastRefresh: Date.now()
      });
      if (seeds[0]?.id) {
        localStorage.setItem(SELECTED_KEY, seeds[0].id);
      }
    }
  },

  addBottle: (title: string, content: string) => {
    const author = generateUser();
    const newBottle: Bottle = {
      id: uuidv4(),
      title,
      content,
      createdAt: Date.now(),
      emoji: generateEmoji(),
      likes: 0,
      dislikes: 0,
      likeUsers: [],
      authorId: author.id,
      authorName: author.nickname
    };
    const next = [newBottle, ...get().bottles];
    saveToStorage(next);
    set({ bottles: next, isModalOpen: false, selectedId: newBottle.id });
    localStorage.setItem(SELECTED_KEY, newBottle.id);
  },

  vote: (bottleId: string, type: VoteType) => {
    const bottles = get().bottles.map(b => {
      if (b.id !== bottleId) return b;
      if (type === 'like') {
        const alreadyLiked = b.likeUsers.some(u => u.id === 'current-user');
        if (alreadyLiked) {
          return {
            ...b,
            likes: Math.max(0, b.likes - 1),
            likeUsers: b.likeUsers.filter(u => u.id !== 'current-user')
          };
        }
        const newUser: User = { id: 'current-user', nickname: '我' };
        return {
          ...b,
          likes: b.likes + 1,
          likeUsers: [...b.likeUsers, newUser]
        };
      } else {
        return {
          ...b,
          dislikes: b.dislikes + 1
        };
      }
    });
    saveToStorage(bottles);
    set({ bottles });
  },

  selectBottle: (id: string | null) => {
    set({ selectedId: id });
    if (id) {
      localStorage.setItem(SELECTED_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_KEY);
    }
  },

  setModalOpen: (open: boolean) => {
    set({ isModalOpen: open });
  },

  refreshPoll: () => {
    const stored = loadFromStorage();
    if (stored) {
      set({
        bottles: stored.sort((a, b) => b.createdAt - a.createdAt),
        lastRefresh: Date.now()
      });
    }
  }
}));
