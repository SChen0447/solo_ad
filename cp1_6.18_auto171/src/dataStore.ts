import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Creative,
  Comment,
  Vote,
  Category,
  CreativeCategory,
  NewCreativeInput,
  NewCommentInput,
} from './types';

const MOCK_CREATIVES: Omit<Creative, 'id' | 'createdAt' | 'votes' | 'comments'>[] = [
  { title: '智能家居中控系统', description: '一个统一控制所有智能设备的中控系统，支持语音、手势和自动化场景，让家真正变得智能。', category: 'tech', authorId: 'user1', authorName: '李明' },
  { title: '沉浸式阅读眼镜', description: 'AR眼镜可以将电子书内容投射到视野中，模拟真实阅读体验，同时支持笔记和词典功能。', category: 'tech', authorId: 'user2', authorName: '张华' },
  { title: '社区共享厨房', description: '在社区建立共享厨房空间，让喜欢烹饪的人可以分享美食，也解决独居人士做饭难的问题。', category: 'life', authorId: 'user3', authorName: '王芳' },
  { title: '城市屋顶农场', description: '利用城市建筑屋顶空间建设垂直农场，生产有机蔬菜，减少运输碳排放。', category: 'life', authorId: 'user4', authorName: '刘强' },
  { title: 'AI艺术创作助手', description: '基于用户情绪和关键词生成个性化艺术作品，可以作为壁纸、社交媒体配图等。', category: 'art', authorId: 'user5', authorName: '陈静' },
  { title: '音乐心情匹配器', description: '根据用户的心率、情绪和天气，智能推荐最适合当前状态的音乐播放列表。', category: 'art', authorId: 'user6', authorName: '赵阳' },
  { title: '技能交换平台', description: '一个让人们交换技能的平台，比如用编程技能换取摄影教学，促进知识共享。', category: 'business', authorId: 'user7', authorName: '孙磊' },
  { title: '本地特产直邮', description: '连接农户和消费者的平台，让各地特产直接从产地送到消费者手中，保证新鲜。', category: 'business', authorId: 'user8', authorName: '周婷' },
  { title: '可穿戴健康监测器', description: '智能手环监测血压、血糖、心电图等健康数据，异常时自动预警并联系医生。', category: 'tech', authorId: 'user9', authorName: '吴医生' },
  { title: '老旧小区电梯共享', description: '为无电梯的老楼设计可共享的移动电梯方案，解决老年人上下楼困难。', category: 'life', authorId: 'user10', authorName: '郑工' },
  { title: '数字遗产管理器', description: '帮助用户规划和管理数字遗产，包括社交媒体账号、数字资产等的传承安排。', category: 'tech', authorId: 'user11', authorName: '冯律师' },
  { title: '陌生人善意连接', description: '一个匿名平台，让人们可以向陌生人发送善意的鼓励和感谢，传递温暖。', category: 'life', authorId: 'user12', authorName: '暖心人' },
];

const MOCK_COMMENTS: Record<string, { userId: string; userName: string; content: string }[]> = {
  '智能家居中控系统': [
    { userId: 'u1', userName: '科技迷', content: '这个想法太棒了！现在每个设备都有自己的APP，太烦了。' },
    { userId: 'u2', userName: '极客小王', content: '如果能支持Matter协议就更完美了 👍' },
  ],
  '沉浸式阅读眼镜': [
    { userId: 'u3', userName: '书虫', content: '终于可以躺着看书不伤颈椎了！' },
  ],
  '社区共享厨房': [
    { userId: 'u4', userName: '美食家', content: '这个社交属性很强啊，可以认识很多志同道合的朋友。' },
    { userId: 'u5', userName: '上班族', content: '下班不想做饭又不想吃外卖，这个太适合我了！' },
  ],
  '城市屋顶农场': [
    { userId: 'u6', userName: '环保人士', content: '节能减排还能吃到新鲜蔬菜，一举多得！🌱' },
  ],
  'AI艺术创作助手': [
    { userId: 'u7', userName: '设计师', content: '作为灵感来源很不错，节省很多时间。' },
    { userId: 'u8', userName: '艺术生', content: '会不会让我们失业啊... 😅' },
  ],
  '音乐心情匹配器': [
    { userId: 'u9', userName: '音乐控', content: '每天通勤必备！🎵' },
  ],
  '技能交换平台': [
    { userId: 'u10', userName: '创业者', content: '这个模式很有意思，可以试试。' },
    { userId: 'u11', userName: '学生党', content: '穷学生表示这个太需要了！' },
    { userId: 'u12', userName: '健身教练', content: '我可以用健身课换编程课 💪' },
  ],
  '本地特产直邮': [
    { userId: 'u13', userName: '吃货', content: '再也不用担心买到假货了！😋' },
  ],
};

interface DataStoreState {
  creatives: Creative[];
  votes: Vote[];
  category: Category;
  currentUserId: string;
  currentUserName: string;
}

interface DataStoreActions {
  addCreative: (input: NewCreativeInput) => void;
  deleteCreative: (id: string) => void;
  addVote: (creativeId: string, userId: string) => boolean;
  removeVote: (creativeId: string, userId: string) => boolean;
  toggleVote: (creativeId: string, userId: string) => void;
  hasVoted: (creativeId: string, userId: string) => boolean;
  addComment: (input: NewCommentInput) => void;
  setCategory: (category: Category) => void;
  getCreativesByCategory: () => Creative[];
  getCreativeById: (id: string) => Creative | undefined;
  getVoteCount: (creativeId: string) => number;
  subscribe: (listener: (state: DataStore) => void) => () => void;
}

export type DataStore = DataStoreState & DataStoreActions;

function generateMockData(): { creatives: Creative[]; votes: Vote[] } {
  const now = Date.now();
  const creatives: Creative[] = [];
  const votes: Vote[] = [];

  MOCK_CREATIVES.forEach((mock, index) => {
    const id = uuidv4();
    const createdAt = now - (index * 3600000 + Math.random() * 7200000);
    const voteCount = Math.floor(Math.random() * 200) + 10;

    for (let i = 0; i < voteCount; i++) {
      votes.push({
        creativeId: id,
        userId: `voter_${i}_${id}`,
        votedAt: createdAt + Math.random() * (now - createdAt),
      });
    }

    const mockComments = MOCK_COMMENTS[mock.title] || [];
    const comments: Comment[] = mockComments.map((c, i) => ({
      id: uuidv4(),
      creativeId: id,
      userId: c.userId,
      userName: c.userName,
      content: c.content,
      createdAt: createdAt + (i + 1) * 600000 + Math.random() * 3600000,
    }));

    creatives.push({
      ...mock,
      id,
      createdAt,
      votes: voteCount,
      comments,
    });
  });

  return { creatives, votes };
}

const mockData = generateMockData();

const listeners = new Set<(state: DataStore) => void>();

export const useDataStore = create<DataStore>((set, get) => {
  const notifyListeners = () => {
    const state = get();
    listeners.forEach((listener) => listener(state));
  };

  return {
    creatives: mockData.creatives,
    votes: mockData.votes,
    category: 'all',
    currentUserId: 'current_user',
    currentUserName: '创意达人',

    addCreative: (input) => {
      const newCreative: Creative = {
        ...input,
        id: uuidv4(),
        createdAt: Date.now(),
        votes: 0,
        comments: [],
      };
      set((state) => ({
        creatives: [newCreative, ...state.creatives],
      }));
      notifyListeners();
    },

    deleteCreative: (id) => {
      set((state) => ({
        creatives: state.creatives.filter((c) => c.id !== id),
        votes: state.votes.filter((v) => v.creativeId !== id),
      }));
      notifyListeners();
    },

    addVote: (creativeId, userId) => {
      const state = get();
      if (state.votes.some((v) => v.creativeId === creativeId && v.userId === userId)) {
        return false;
      }
      set((s) => ({
        votes: [...s.votes, { creativeId, userId, votedAt: Date.now() }],
        creatives: s.creatives.map((c) =>
          c.id === creativeId ? { ...c, votes: c.votes + 1 } : c
        ),
      }));
      notifyListeners();
      return true;
    },

    removeVote: (creativeId, userId) => {
      const state = get();
      if (!state.votes.some((v) => v.creativeId === creativeId && v.userId === userId)) {
        return false;
      }
      set((s) => ({
        votes: s.votes.filter((v) => !(v.creativeId === creativeId && v.userId === userId)),
        creatives: s.creatives.map((c) =>
          c.id === creativeId ? { ...c, votes: Math.max(0, c.votes - 1) } : c
        ),
      }));
      notifyListeners();
      return true;
    },

    toggleVote: (creativeId, userId) => {
      const hasVoted = get().hasVoted(creativeId, userId);
      if (hasVoted) {
        get().removeVote(creativeId, userId);
      } else {
        get().addVote(creativeId, userId);
      }
    },

    hasVoted: (creativeId, userId) => {
      return get().votes.some((v) => v.creativeId === creativeId && v.userId === userId);
    },

    addComment: (input) => {
      const newComment: Comment = {
        ...input,
        id: uuidv4(),
        createdAt: Date.now(),
      };
      set((state) => ({
        creatives: state.creatives.map((c) =>
          c.id === input.creativeId
            ? { ...c, comments: [...c.comments, newComment] }
            : c
        ),
      }));
      notifyListeners();
    },

    setCategory: (category) => {
      set({ category });
      notifyListeners();
    },

    getCreativesByCategory: () => {
      const state = get();
      if (state.category === 'all') {
        return [...state.creatives].sort((a, b) => b.createdAt - a.createdAt);
      }
      return state.creatives
        .filter((c) => c.category === state.category)
        .sort((a, b) => b.createdAt - a.createdAt);
    },

    getCreativeById: (id) => {
      return get().creatives.find((c) => c.id === id);
    },

    getVoteCount: (creativeId) => {
      return get().votes.filter((v) => v.creativeId === creativeId).length;
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

export const categoryLabels: Record<Category, string> = {
  all: '全部',
  tech: '科技',
  art: '艺术',
  life: '生活',
  business: '商业',
};

export const categoryColor: Record<CreativeCategory, string> = {
  tech: '#4ecdc4',
  art: '#ff6b9d',
  life: '#95e1d3',
  business: '#f38181',
};
