import { v4 as uuidv4 } from 'uuid';

export type ResourceType = '笔记' | '习题' | '课件' | '其他';

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  description: string;
  author: string;
  createdAt: number;
}

export type ExchangeStatus = 'pending' | 'accepted' | 'rejected';

export interface ExchangeRequest {
  id: string;
  resourceId: string;
  fromUser: string;
  toUser: string;
  status: ExchangeStatus;
  createdAt: number;
}

const RESOURCE_TYPES: ResourceType[] = ['笔记', '习题', '课件', '其他'];
const SAMPLE_AUTHORS = ['张同学', '李同学', '王同学', '赵同学', '刘同学', '陈同学', '杨同学', '黄同学', '周同学', '吴同学'];
const SAMPLE_TITLES: Record<ResourceType, string[]> = {
  '笔记': ['高等数学笔记', '线性代数笔记', '概率论笔记', '数据结构笔记', '操作系统笔记', '计算机网络笔记', '数据库原理笔记', '编译原理笔记', '离散数学笔记', '数值分析笔记'],
  '习题': ['高数习题集', '线代习题集', '概率论习题集', '算法习题集', 'OS习题集', '网络习题集', '数据库习题集', '编译原理习题集', '离散数学习题集', '数值分析习题集'],
  '课件': ['高数课件', '线代课件', '概率论课件', '数据结构课件', '操作系统课件', '网络课件', '数据库课件', '编译原理课件', '离散数学课件', '数值分析课件'],
  '其他': ['学习方法总结', '考试时间表', '学习路线图', '工具推荐', '参考书单', '实验报告模板', '论文写作指南', '考研经验分享', '实习面试题', '课程评价汇总'],
};

function generateResources(count: number): Resource[] {
  const resources: Resource[] = [];
  for (let i = 0; i < count; i++) {
    const type = RESOURCE_TYPES[i % RESOURCE_TYPES.length];
    const titles = SAMPLE_TITLES[type];
    const titleIndex = Math.floor(i / RESOURCE_TYPES.length) % titles.length;
    resources.push({
      id: uuidv4(),
      title: `${titles[titleIndex]} #${i + 1}`,
      type,
      description: `这是${SAMPLE_AUTHORS[i % SAMPLE_AUTHORS.length]}分享的${type}类资源，内容详实，适合复习和参考。`,
      author: SAMPLE_AUTHORS[i % SAMPLE_AUTHORS.length],
      createdAt: Date.now() - (count - i) * 3600000,
    });
  }
  return resources;
}

let resources: Resource[] = generateResources(100);
let favorites: Set<string> = new Set();
let exchangeRequests: ExchangeRequest[] = [];

export function getResources(): Resource[] {
  return resources;
}

export function addResource(data: Omit<Resource, 'id' | 'createdAt'>): Resource {
  const resource: Resource = {
    ...data,
    id: uuidv4(),
    createdAt: Date.now(),
  };
  resources = [resource, ...resources];
  return resource;
}

export function searchResources(keyword: string, type: ResourceType | null): Resource[] {
  let result = resources;
  if (type) {
    result = result.filter((r) => r.type === type);
  }
  if (keyword.trim()) {
    const kw = keyword.trim().toLowerCase();
    result = result.filter(
      (r) =>
        r.title.toLowerCase().includes(kw) ||
        r.description.toLowerCase().includes(kw) ||
        r.author.toLowerCase().includes(kw)
    );
  }
  return result;
}

export function toggleFavorite(resourceId: string): boolean {
  if (favorites.has(resourceId)) {
    favorites.delete(resourceId);
    return false;
  }
  favorites.add(resourceId);
  return true;
}

export function isFavorite(resourceId: string): boolean {
  return favorites.has(resourceId);
}

export function getFavoriteResources(): Resource[] {
  return resources.filter((r) => favorites.has(r.id));
}

export function createExchangeRequest(resourceId: string, fromUser: string, toUser: string): ExchangeRequest {
  const request: ExchangeRequest = {
    id: uuidv4(),
    resourceId,
    fromUser,
    toUser,
    status: 'pending',
    createdAt: Date.now(),
  };
  exchangeRequests = [...exchangeRequests, request];
  return request;
}

export function getExchangeRequests(): ExchangeRequest[] {
  return exchangeRequests;
}

export function updateExchangeRequest(id: string, status: ExchangeStatus): ExchangeRequest | undefined {
  exchangeRequests = exchangeRequests.map((r) => (r.id === id ? { ...r, status } : r));
  return exchangeRequests.find((r) => r.id === id);
}
