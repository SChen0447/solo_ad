import { v4 as uuidv4 } from 'uuid';
import { Idea, Score, CreateIdeaDTO, SubmitScoreDTO, SortType } from '../../shared/types';

let ideas: Idea[] = [];

const WEIGHTS = {
  creativity: 0.35,
  feasibility: 0.35,
  influence: 0.30
};

function calculateOverallScore(scores: Score[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => {
    return sum + s.creativity * WEIGHTS.creativity + s.feasibility * WEIGHTS.feasibility + s.influence * WEIGHTS.influence;
  }, 0);
  return Math.round((total / scores.length) * 10) / 10;
}

export function createIdea(dto: CreateIdeaDTO): Idea {
  const idea: Idea = {
    id: uuidv4(),
    title: dto.title,
    description: dto.description,
    category: dto.category,
    authorId: dto.authorId,
    scores: [],
    overallScore: 0,
    createdAt: Date.now(),
    adopted: false
  };
  ideas.unshift(idea);
  return idea;
}

export function getAllIdeas(sortType: SortType = 'score', searchQuery: string = ''): Idea[] {
  let filtered = ideas;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = ideas.filter(
      (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    );
  }
  return sortIdeas(filtered, sortType);
}

export function getIdeaById(id: string): Idea | undefined {
  return ideas.find((i) => i.id === id);
}

export function submitScore(ideaId: string, dto: SubmitScoreDTO): Idea | undefined {
  const idea = ideas.find((i) => i.id === ideaId);
  if (!idea) return undefined;

  const score: Score = {
    id: uuidv4(),
    creativity: dto.creativity,
    feasibility: dto.feasibility,
    influence: dto.influence,
    timestamp: Date.now()
  };
  idea.scores.push(score);
  idea.overallScore = calculateOverallScore(idea.scores);
  return idea;
}

export function markAsAdopted(ideaId: string): Idea | undefined {
  const idea = ideas.find((i) => i.id === ideaId);
  if (!idea) return undefined;
  idea.adopted = true;
  return idea;
}

function sortIdeas(ideaList: Idea[], sortType: SortType): Idea[] {
  const sorted = [...ideaList];
  sorted.sort((a, b) => {
    if (a.adopted !== b.adopted) return a.adopted ? -1 : 1;
    switch (sortType) {
      case 'score':
        return b.overallScore - a.overallScore;
      case 'time':
        return b.createdAt - a.createdAt;
      case 'votes':
        return b.scores.length - a.scores.length;
      default:
        return b.overallScore - a.overallScore;
    }
  });
  return sorted;
}

export function getRankedIdeas(): Idea[] {
  return sortIdeas(ideas, 'score');
}

export function initializeSampleData(): void {
  const sampleIdeas: CreateIdeaDTO[] = [
    {
      title: 'AI智能写作助手功能',
      description: '基于大语言模型构建的写作助手，能够根据用户输入的关键词自动生成文章大纲、润色文案，支持多种文体风格切换，帮助创作者快速完成内容初稿。',
      category: '产品功能',
      authorId: 'user-1'
    },
    {
      title: '创意挑战赛营销活动',
      description: '发起为期30天的用户创意挑战赛，设置阶梯式奖金池，鼓励用户提交创意方案并投票，优胜者可获得产品终身会员资格，同时为平台带来UGC内容传播。',
      category: '营销活动',
      authorId: 'user-2'
    },
    {
      title: '团队协作效率仪表盘',
      description: '可视化展示团队工作进度、任务分配和个人贡献度，自动生成周报和月报，集成日历提醒和番茄钟功能，一站式解决团队效率管理需求。',
      category: '效率工具',
      authorId: 'user-3'
    },
    {
      title: '创意配对社交功能',
      description: '根据用户兴趣标签和擅长领域进行智能匹配，建立创意合伙人对接机制，支持线上头脑风暴房间和灵感共享白板，促进跨领域协作创新。',
      category: '社交互动',
      authorId: 'user-1'
    },
    {
      title: '创意点子语音输入',
      description: '支持语音快速录入创意点子，自动识别语音内容并转换为结构化文本，提取关键词和标签分类，让灵感不再稍纵即逝。',
      category: '其他',
      authorId: 'user-2'
    }
  ];

  sampleIdeas.forEach((dto) => {
    const idea = createIdea(dto);
    const randomScores = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < randomScores; i++) {
      submitScore(idea.id, {
        creativity: Math.floor(Math.random() * 6) + 5,
        feasibility: Math.floor(Math.random() * 6) + 5,
        influence: Math.floor(Math.random() * 6) + 5
      });
    }
  });
}
