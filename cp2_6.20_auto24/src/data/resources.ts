import { v4 as uuidv4 } from 'uuid';
import type { Resource, ResourceType, Favorite, ExchangeRequest, ExchangeStatus } from '../types';

const mockTitles = [
  '高等数学第一章笔记', '线性代数习题集', 'Python编程入门课件', '英语四级词汇表',
  '数据结构复习资料', '物理实验报告模板', '化学方程式总结', '生物知识点整理',
  '历史时间轴', '地理知识点梳理', '政治考点汇总', '概率论笔记', '微积分习题详解',
  '离散数学课件', '算法设计与分析', '计算机网络基础', '操作系统概念',
  '编译原理笔记', '数据库系统概论', '软件工程课件', '人工智能导论',
  '机器学习基础', '深度学习入门', '计算机视觉基础', '自然语言处理',
  '前端开发笔记', '后端开发指南', '移动端开发', '云计算概念',
  '网络安全基础', '密码学入门', '设计模式笔记', '敏捷开发实践',
  '项目管理教程', '产品设计思维', 'UI设计基础', '交互设计原则',
  '数据分析入门', '统计学基础', '经济学原理', '金融学概论',
  '会计学基础', '市场营销学', '管理学原理', '心理学导论',
  '哲学基础', '文学作品赏析', '艺术史概论', '音乐基础',
  '摄影技巧教程', '书法入门指南'
];

const mockOwners = [
  '小明', '小红', '小华', '小李', '小王', '小张', '小刘', '小陈',
  '小林', '小周', '小吴', '小郑', '小孙', '小赵', '小钱'
];

const mockDescriptions = [
  '详细的知识点整理，包含例题解析，适合期末复习使用。',
  '老师上课的PPT整理，重点内容已经标注。',
  '历年真题及答案解析，非常珍贵的复习资料。',
  '个人学习笔记，条理清晰，重点突出。',
  '课程作业参考答案，仅供参考学习。',
  '考试重点归纳，帮助快速掌握核心内容。',
  '实战项目源码和文档，非常有学习价值。',
  '思维导图整理，便于记忆和理解。'
];

const types: ResourceType[] = ['笔记', '习题', '课件', '其他'];

export function generateMockResources(count: number): Resource[] {
  const resources: Resource[] = [];
  for (let i = 0; i < count; i++) {
    const titleIndex = i % mockTitles.length;
    const suffix = i >= mockTitles.length ? ' (' + (Math.floor(i / mockTitles.length) + 1) + ')' : '';
    resources.push({
      id: uuidv4(),
      title: mockTitles[titleIndex] + suffix,
      type: types[i % types.length],
      description: mockDescriptions[i % mockDescriptions.length],
      ownerId: 'user-' + ((i % mockOwners.length) + 1),
      ownerName: mockOwners[i % mockOwners.length],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    });
  }
  return resources;
}

export class ResourceStore {
  private resources: Resource[] = generateMockResources(100);
  private favorites: Favorite[] = [];
  private exchangeRequests: ExchangeRequest[] = [];

  getResources(): Resource[] {
    return [...this.resources];
  }

  getResourcesPaginated(startIndex: number, count: number): { items: Resource[]; total: number; hasMore: boolean } {
    const items = this.resources.slice(startIndex, startIndex + count);
    const total = this.resources.length;
    const hasMore = startIndex + count < total;
    return { items, total, hasMore };
  }

  getFilteredResourcesPaginated(
    startIndex: number,
    count: number,
    keyword: string,
    typeFilter: ResourceType | 'all'
  ): { items: Resource[]; total: number; hasMore: boolean } {
    let filtered = this.resources;

    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }

    if (keyword.trim()) {
      const lowerKeyword = keyword.toLowerCase().trim();
      filtered = filtered.filter(
        r =>
          r.title.toLowerCase().includes(lowerKeyword) ||
          r.description.toLowerCase().includes(lowerKeyword)
      );
    }

    const total = filtered.length;
    const items = filtered.slice(startIndex, startIndex + count);
    const hasMore = startIndex + count < total;
    return { items, total, hasMore };
  }

  getResourceById(id: string): Resource | undefined {
    return this.resources.find(r => r.id === id);
  }

  addResource(resource: Omit<Resource, 'id' | 'createdAt'>): Resource {
    const newResource: Resource = {
      ...resource,
      id: uuidv4(),
      createdAt: new Date()
    };
    this.resources.unshift(newResource);
    return newResource;
  }

  getFavorites(): Favorite[] {
    return [...this.favorites];
  }

  getFavoriteResourceIds(userId: string): string[] {
    return this.favorites
      .filter(f => f.userId === userId)
      .map(f => f.resourceId);
  }

  isFavorite(userId: string, resourceId: string): boolean {
    return this.favorites.some(
      f => f.userId === userId && f.resourceId === resourceId
    );
  }

  toggleFavorite(userId: string, resourceId: string): boolean {
    const index = this.favorites.findIndex(
      f => f.userId === userId && f.resourceId === resourceId
    );
    if (index !== -1) {
      this.favorites.splice(index, 1);
      return false;
    } else {
      this.favorites.push({
        id: uuidv4(),
        userId,
        resourceId,
        createdAt: new Date()
      });
      return true;
    }
  }

  getExchangeRequests(): ExchangeRequest[] {
    return [...this.exchangeRequests];
  }

  getExchangeRequestsForUser(userId: string): ExchangeRequest[] {
    return this.exchangeRequests.filter(r => r.toUserId === userId);
  }

  getExchangeRequestsFromUser(userId: string): ExchangeRequest[] {
    return this.exchangeRequests.filter(r => r.fromUserId === userId);
  }

  createExchangeRequest(
    fromUserId: string,
    fromUserName: string,
    toUserId: string,
    resourceId: string,
    resourceTitle: string
  ): ExchangeRequest {
    const request: ExchangeRequest = {
      id: uuidv4(),
      fromUserId,
      fromUserName,
      toUserId,
      resourceId,
      resourceTitle,
      status: 'pending',
      createdAt: new Date()
    };
    this.exchangeRequests.unshift(request);
    return request;
  }

  updateExchangeStatus(requestId: string, status: ExchangeStatus): ExchangeRequest | undefined {
    const request = this.exchangeRequests.find(r => r.id === requestId);
    if (request) {
      request.status = status;
    }
    return request;
  }

  getFavoriteResources(userId: string): Resource[] {
    const favoriteIds = this.getFavoriteResourceIds(userId);
    return this.resources.filter(r => favoriteIds.includes(r.id));
  }
}

export const resourceStore = new ResourceStore();
