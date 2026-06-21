import { v4 as uuidv4 } from 'uuid';

export type Category = '产品功能' | '活动方案' | '技术选型';

export const CATEGORIES: Category[] = ['产品功能', '活动方案', '技术选型'];

export interface Proposal {
  id: string;
  topicId: string;
  content: string;
  createdAt: number;
  votes: number;
}

export interface Topic {
  id: string;
  name: string;
  category: Category;
  deadline: number;
  createdAt: number;
  proposals: Proposal[];
  voterIds: Set<string>;
  status: 'active' | 'ended';
}

export interface TopicPublic {
  id: string;
  name: string;
  category: Category;
  deadline: number;
  createdAt: number;
  proposals: Proposal[];
  totalVoters: number;
  status: 'active' | 'ended';
}

export interface RankedProposal extends Proposal {
  rank: number;
}

class VoteEngine {
  private topics: Map<string, Topic> = new Map();
  private userVotes: Map<string, string> = new Map();

  constructor() {
    this.seedMockData();
  }

  private seedMockData(): void {
    const mockTopics: Array<{
      name: string;
      category: Category;
      deadlineOffset: number;
      proposals: string[];
    }> = [
      {
        name: '2026年Q3产品功能优先级投票',
        category: '产品功能',
        deadlineOffset: 7 * 24 * 60 * 60 * 1000,
        proposals: [
          '增加暗黑模式支持，提升夜间使用体验',
          '实现数据导出功能，支持Excel和PDF格式',
          '优化搜索算法，支持模糊匹配和关键词高亮',
          '增加团队协作空间，支持实时多人编辑',
        ],
      },
      {
        name: '年度团建活动方案评选',
        category: '活动方案',
        deadlineOffset: 3 * 24 * 60 * 60 * 1000,
        proposals: [
          '户外露营两日游，包含篝火晚会和拓展训练',
          '城市剧本杀+美食探店，沉浸式体验',
          '海边度假村休闲游，帆船出海体验',
        ],
      },
      {
        name: '前端框架技术选型',
        category: '技术选型',
        deadlineOffset: 14 * 24 * 60 * 60 * 1000,
        proposals: [
          'React 18 + TypeScript，生态成熟，学习曲线平缓',
          'Vue 3 + Composition API，上手快，国内社区活跃',
          'Svelte + SvelteKit，编译时优化，性能出色',
          'Solid.js，类React语法，细粒度响应式性能极佳',
        ],
      },
      {
        name: '移动端App核心功能投票',
        category: '产品功能',
        deadlineOffset: 5 * 24 * 60 * 60 * 1000,
        proposals: [
          '离线模式支持，无网络时也能查看已缓存数据',
          '消息推送中心，重要通知不遗漏',
          '快捷手势操作，提升单手使用效率',
          '深色模式自动切换，跟随系统设置',
        ],
      },
      {
        name: '新员工入职培训方案',
        category: '活动方案',
        deadlineOffset: -1 * 24 * 60 * 60 * 1000,
        proposals: [
          '导师制一对一带教，为期一个月的深度辅导',
          '沉浸式轮岗体验，了解各部门运作',
          '线上学习平台+每周答疑，灵活安排学习进度',
        ],
      },
      {
        name: '后端数据库技术选型',
        category: '技术选型',
        deadlineOffset: 10 * 24 * 60 * 60 * 1000,
        proposals: [
          'PostgreSQL，功能强大，支持JSON和全文搜索',
          'MySQL，成熟稳定，运维经验丰富',
          'MongoDB，文档型数据库，Schema灵活',
          'TiDB，分布式NewSQL，水平扩展能力强',
        ],
      },
      {
        name: '会员权益体系优化',
        category: '产品功能',
        deadlineOffset: 2 * 24 * 60 * 60 * 1000,
        proposals: [
          '增加积分兑换商城，积分可兑换实物礼品',
          '推出专属客服通道，会员优先响应',
          '会员专享内容，定期更新独家教程和案例',
          '生日特权礼包，当月双倍积分+专属折扣',
        ],
      },
      {
        name: '双11营销活动策划',
        category: '活动方案',
        deadlineOffset: 20 * 24 * 60 * 60 * 1000,
        proposals: [
          '阶梯式满减优惠，消费越多折扣越大',
          '限时秒杀+整点抽奖，刺激用户活跃度',
          '邀请好友助力，裂变式传播获取优惠券',
          '预付定金翻倍，提前锁定优惠资格',
        ],
      },
      {
        name: 'API网关技术选型',
        category: '技术选型',
        deadlineOffset: 6 * 24 * 60 * 60 * 1000,
        proposals: [
          'Kong，基于Nginx，插件生态丰富',
          'APISIX，Apache顶级项目，性能优异',
          'Spring Cloud Gateway，Java技术栈友好',
          'Envoy，云原生，Service Mesh首选',
        ],
      },
      {
        name: '客服系统功能升级投票',
        category: '产品功能',
        deadlineOffset: -2 * 60 * 60 * 1000,
        proposals: [
          'AI智能客服机器人，7x24小时自动应答',
          '多渠道统一接入，支持网页/微信/APP',
          '工单流转系统，复杂问题高效跟进',
          '满意度评价系统，持续优化服务质量',
        ],
      },
    ];

    mockTopics.forEach((mock) => {
      const topicId = uuidv4();
      const now = Date.now();
      const topic: Topic = {
        id: topicId,
        name: mock.name,
        category: mock.category,
        deadline: now + mock.deadlineOffset,
        createdAt: now - Math.random() * 5 * 24 * 60 * 60 * 1000,
        proposals: [],
        voterIds: new Set(),
        status: now + mock.deadlineOffset <= now ? 'ended' : 'active',
      };

      mock.proposals.forEach((content, idx) => {
        const proposal: Proposal = {
          id: uuidv4(),
          topicId,
          content,
          createdAt: now - (mock.proposals.length - idx) * 60 * 60 * 1000,
          votes: Math.floor(Math.random() * 30) + 5,
        };
        topic.proposals.push(proposal);
      });

      topic.proposals.forEach((p) => {
        for (let i = 0; i < p.votes; i++) {
          topic.voterIds.add(uuidv4());
        }
      });

      this.topics.set(topicId, topic);
    });
  }

  createTopic(
    name: string,
    category: Category,
    deadline: number
  ): TopicPublic {
    const id = uuidv4();
    const now = Date.now();
    const topic: Topic = {
      id,
      name,
      category,
      deadline,
      createdAt: now,
      proposals: [],
      voterIds: new Set(),
      status: deadline <= now ? 'ended' : 'active',
    };
    this.topics.set(id, topic);
    return this.toPublic(topic);
  }

  addProposal(topicId: string, content: string): Proposal | null {
    const topic = this.topics.get(topicId);
    if (!topic || topic.status === 'ended') return null;

    const proposal: Proposal = {
      id: uuidv4(),
      topicId,
      content,
      createdAt: Date.now(),
      votes: 0,
    };
    topic.proposals.unshift(proposal);
    return proposal;
  }

  castVote(
    topicId: string,
    proposalId: string,
    voterId: string
  ): { success: boolean; message?: string; topic?: TopicPublic } {
    const topic = this.topics.get(topicId);
    if (!topic) {
      return { success: false, message: '话题不存在' };
    }
    if (topic.status === 'ended') {
      return { success: false, message: '投票已结束' };
    }
    if (topic.voterIds.has(voterId)) {
      return { success: false, message: '您已经投过票了' };
    }

    const proposal = topic.proposals.find((p) => p.id === proposalId);
    if (!proposal) {
      return { success: false, message: '提案不存在' };
    }

    proposal.votes++;
    topic.voterIds.add(voterId);

    if (Date.now() >= topic.deadline) {
      topic.status = 'ended';
    }

    return { success: true, topic: this.toPublic(topic) };
  }

  endTopic(topicId: string): TopicPublic | null {
    const topic = this.topics.get(topicId);
    if (!topic) return null;
    topic.status = 'ended';
    return this.toPublic(topic);
  }

  getTopic(topicId: string): TopicPublic | null {
    const topic = this.topics.get(topicId);
    if (!topic) return null;
    if (topic.status === 'active' && Date.now() >= topic.deadline) {
      topic.status = 'ended';
    }
    return this.toPublic(topic);
  }

  getAllTopics(category?: Category): TopicPublic[] {
    const all: TopicPublic[] = [];
    this.topics.forEach((topic) => {
      if (topic.status === 'active' && Date.now() >= topic.deadline) {
        topic.status = 'ended';
      }
      if (!category || topic.category === category) {
        all.push(this.toPublic(topic));
      }
    });
    return all.sort((a, b) => b.createdAt - a.createdAt);
  }

  getRankings(topicId: string): RankedProposal[] {
    const topic = this.topics.get(topicId);
    if (!topic) return [];

    const sorted = [...topic.proposals].sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.createdAt - b.createdAt;
    });

    let currentRank = 0;
    let lastVotes = -1;
    return sorted.map((proposal, index) => {
      if (proposal.votes !== lastVotes) {
        currentRank = index + 1;
        lastVotes = proposal.votes;
      }
      return { ...proposal, rank: currentRank };
    });
  }

  hasUserVoted(topicId: string, voterId: string): boolean {
    const topic = this.topics.get(topicId);
    if (!topic) return false;
    return topic.voterIds.has(voterId);
  }

  getUserVote(topicId: string, voterId: string): string | null {
    const key = `${topicId}:${voterId}`;
    return this.userVotes.get(key) || null;
  }

  recordUserVote(topicId: string, voterId: string, proposalId: string): void {
    const key = `${topicId}:${voterId}`;
    this.userVotes.set(key, proposalId);
  }

  private toPublic(topic: Topic): TopicPublic {
    return {
      id: topic.id,
      name: topic.name,
      category: topic.category,
      deadline: topic.deadline,
      createdAt: topic.createdAt,
      proposals: [...topic.proposals].sort((a, b) => b.createdAt - a.createdAt),
      totalVoters: topic.voterIds.size,
      status: topic.status,
    };
  }
}

export const voteEngine = new VoteEngine();
