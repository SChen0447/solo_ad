import type { Proposal, ServiceItem, ProposalVersion, Comment } from './types';
export type { Proposal, ServiceItem, ProposalVersion, Comment, ProposalStatus } from './types';
export { statusLabels } from './types';

const generateId = (): string => Math.random().toString(36).slice(2, 10);

const now = Date.now();
const dayMs = 86400000;

const createServices = (seed: number): ServiceItem[] => [
  {
    id: generateId() + seed,
    name: '需求分析与调研',
    description: '深入了解业务需求，用户画像分析，竞品调研，输出需求规格说明书',
    unitPrice: 5000,
    quantity: 1,
    unit: '项'
  },
  {
    id: generateId() + seed,
    name: 'UI/UX 设计',
    description: '包含首页、列表页、详情页等核心页面设计，提供3套设计方案供选择',
    unitPrice: 8000,
    quantity: 1,
    unit: '套'
  },
  {
    id: generateId() + seed,
    name: '前端开发',
    description: '基于 React + TypeScript 开发响应式Web应用，含单元测试和性能优化',
    unitPrice: 1200,
    quantity: 15,
    unit: '人天'
  },
  {
    id: generateId() + seed,
    name: '后端开发',
    description: 'Node.js + Express 服务端开发，RESTful API 设计，数据库设计与优化',
    unitPrice: 1500,
    quantity: 10,
    unit: '人天'
  },
  {
    id: generateId() + seed,
    name: '测试与部署',
    description: '集成测试、性能测试、安全测试，以及线上部署与运维文档交付',
    unitPrice: 3000,
    quantity: 1,
    unit: '项'
  }
];

const calcTotal = (services: ServiceItem[]): number =>
  services.reduce((sum, s) => sum + s.unitPrice * s.quantity, 0);

const createVersion = (
  title: string,
  desc: string,
  services: ServiceItem[],
  daysAgo: number
): ProposalVersion => {
  const total = calcTotal(services);
  return {
    id: generateId(),
    title,
    description: desc,
    services: JSON.parse(JSON.stringify(services)),
    totalAmount: total,
    clientName: '',
    clientEmail: '',
    companyName: '',
    companyEmail: '',
    companyAddress: '',
    companyPhone: '',
    createdAt: now - daysAgo * dayMs
  };
};

const createComments = (seed: number): Comment[] => [
  {
    id: generateId() + seed,
    author: '李明（客户）',
    content: '整体方案不错，希望能在设计阶段多提供几版草图供我们内部讨论。',
    rating: 4,
    timestamp: now - 5 * dayMs
  },
  {
    id: generateId() + seed + 1,
    author: '王芳（客户）',
    content: '价格能否再优惠一些？我们后续还有二期项目可以合作。',
    rating: 3,
    timestamp: now - 2 * dayMs
  }
];

const companyInfo = {
  companyName: '星辰数字科技有限公司',
  companyEmail: 'business@stardigit.com',
  companyAddress: '北京市朝阳区建国路88号SOHO现代城A座1208室',
  companyPhone: '010-8888-6666'
};

const proposalTemplates = [
  {
    title: '电商平台官网重构项目',
    description: '对现有电商平台进行全面重构，提升用户体验和系统性能，支持高并发访问。',
    status: 'accepted' as const,
    clientName: '张海涛',
    clientEmail: 'zhanght@example.com',
    days: 0
  },
  {
    title: '企业管理系统开发',
    description: '为客户定制开发一套完整的企业内部管理系统，包含人事、财务、项目管理模块。',
    status: 'sent' as const,
    clientName: '刘建国',
    clientEmail: 'liu.jg@example.com',
    days: 1
  },
  {
    title: '移动端APP UI设计',
    description: '为健身类APP提供全套UI设计方案，包含启动页、首页、课程页、个人中心等核心页面。',
    status: 'draft' as const,
    clientName: '陈小燕',
    clientEmail: 'chenxy@example.com',
    days: 3
  },
  {
    title: '数据可视化大屏开发',
    description: '为城市交通管理部门开发实时数据可视化大屏，展示交通流量、拥堵预警等信息。',
    status: 'rejected' as const,
    clientName: '赵志强',
    clientEmail: 'zhao.zq@example.com',
    days: 7
  },
  {
    title: '在线教育平台搭建',
    description: '搭建完整的在线教育平台，支持直播课程、录播回放、作业提交、学习进度追踪等功能。',
    status: 'sent' as const,
    clientName: '孙美玲',
    clientEmail: 'sunml@example.com',
    days: 4
  },
  {
    title: '金融行业官网设计',
    description: '为证券公司设计品牌官网，突出专业稳重的形象，包含产品展示、资讯发布、投教专区。',
    status: 'accepted' as const,
    clientName: '周文博',
    clientEmail: 'zhouwb@example.com',
    days: 10
  },
  {
    title: '小程序商城开发',
    description: '开发微信小程序端的美妆商城，支持商品浏览、购物车、订单管理、会员积分等功能。',
    status: 'draft' as const,
    clientName: '吴丽华',
    clientEmail: 'wulh@example.com',
    days: 2
  },
  {
    title: 'SaaS产品官网改版',
    description: '对现有SaaS产品官网进行改版升级，提升品牌形象，优化转化路径，增加落地页。',
    status: 'sent' as const,
    clientName: '郑鹏飞',
    clientEmail: 'zhengpf@example.com',
    days: 5
  }
];

const createProposal = (template: typeof proposalTemplates[0], index: number): Proposal => {
  const services = createServices(index);
  const total = calcTotal(services);
  const versions: ProposalVersion[] = [];

  const v1Services = services.slice(0, 3).map((s, i) => ({
    ...s,
    id: generateId() + i,
    quantity: Math.max(1, s.quantity - 2)
  }));
  versions.push(createVersion(template.title + '（初稿）', '初始方案，仅包含核心功能', v1Services, template.days + 15));

  const v2Services = services.slice(0, 4).map((s, i) => ({
    ...s,
    id: generateId() + i + 10,
    quantity: Math.max(1, s.quantity - 1)
  }));
  versions.push(createVersion(template.title, '补充了后端开发内容，完善技术方案', v2Services, template.days + 8));

  versions.push(createVersion(template.title, template.description, services, template.days));

  return {
    id: 'prop-' + (index + 1),
    title: template.title,
    description: template.description,
    services,
    totalAmount: total,
    status: template.status,
    clientName: template.clientName,
    clientEmail: template.clientEmail,
    ...companyInfo,
    lastUpdated: now - template.days * dayMs,
    versions,
    comments: createComments(index * 10)
  };
};

export const mockProposals: Proposal[] = proposalTemplates.map((t, i) => createProposal(t, i));

export const getProposalById = (id: string): Proposal | undefined =>
  mockProposals.find(p => p.id === id);

export const avgRating = (comments: Comment[]): number => {
  if (comments.length === 0) return 0;
  const sum = comments.reduce((acc, c) => acc + c.rating, 0);
  return Math.round((sum / comments.length) * 10) / 10;
};

export const formatCurrency = (amount: number): string =>
  '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatDateTime = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
