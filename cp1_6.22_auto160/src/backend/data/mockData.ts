import { Activity } from '../types';
import { v4 as uuidv4 } from 'uuid';

const speakers = [
  '张伟博士', '李明教授', '王芳工程师', '赵磊架构师', '陈静研究员',
  '刘洋CTO', '杨帆产品总监', '黄薇设计总监', '周杰技术布道师', '吴敏数据科学家'
];

const locations = [
  '主会场A', '分会场B', '工作坊室C', '社交大厅D', '圆桌会议室E',
  '创新实验室F', '展示厅G', '培训室H'
];

const tagPool = [
  'WebAssembly', 'AI伦理', '微服务', '云原生', 'DevOps',
  'React', 'TypeScript', 'Node.js', '机器学习', '区块链',
  '边缘计算', '量子计算', '网络安全', '数据可视化', '用户体验',
  '敏捷开发', '系统设计', '性能优化', '测试自动化', '移动端开发',
  'GraphQL', 'Kubernetes', 'Docker', 'Serverless', 'Rust'
];

const talkTitles = [
  'WebAssembly的未来发展趋势',
  'AI伦理与社会责任',
  '微服务架构最佳实践',
  '云原生应用设计模式',
  'DevOps流水线深度解析',
  'React 19新特性全面解读',
  'TypeScript高级类型编程',
  'Node.js性能调优指南',
  '机器学习在前端的应用',
  '区块链技术与去中心化身份',
  '边缘计算：下一代分布式系统',
  '量子计算入门与应用前景',
  '网络安全纵深防御体系',
  '数据可视化的艺术与科学',
  '以用户为中心的产品设计',
  '敏捷团队的高效协作模式',
  '大规模分布式系统设计',
  '前端性能优化实战',
  '自动化测试策略与实践',
  '跨平台移动开发技术对比'
];

const workshopTitles = [
  'WebAssembly实战工作坊',
  'React Hooks深度训练营',
  'TypeScript项目实战',
  'Kubernetes部署实战',
  '机器学习入门工作坊',
  'Docker容器化实践',
  'GraphQL API设计工作坊',
  'Serverless架构实战',
  '性能调优实战训练营',
  'Rust语言入门工作坊'
];

const socialTitles = [
  '技术领导者早餐会',
  '开源社区交流会',
  '女性技术工作者茶话会',
  '创业者圆桌讨论',
  '产品经理与工程师对话',
  '年度技术趋势辩论会',
  '新人欢迎晚宴',
  '黑客马拉松开幕式',
  '技术图书签售会',
  '职业发展导师见面会'
];

function generateActivities(): Activity[] {
  const activities: Activity[] = [];
  const dates = ['2026-06-23', '2026-06-24', '2026-06-25'];
  
  const difficulties: ('beginner' | 'intermediate' | 'advanced')[] = ['beginner', 'intermediate', 'advanced'];
  
  const timeSlots = [
    { start: '09:00', end: '10:00' },
    { start: '10:30', end: '11:30' },
    { start: '13:00', end: '14:00' },
    { start: '14:30', end: '15:30' },
    { start: '16:00', end: '17:00' },
    { start: '19:00', end: '20:30' }
  ];

  talkTitles.forEach((title, idx) => {
    const dateIdx = idx % dates.length;
    const timeIdx = Math.floor(idx / 4) % timeSlots.length;
    const tags = [
      tagPool[idx % tagPool.length],
      tagPool[(idx + 5) % tagPool.length],
      tagPool[(idx + 10) % tagPool.length]
    ];
    
    activities.push({
      id: uuidv4(),
      title,
      description: `深入探讨${title}的核心概念与实践经验，由行业专家分享最新研究成果和实战案例。`,
      type: 'talk',
      difficulty: difficulties[idx % 3],
      date: dates[dateIdx],
      startTime: timeSlots[timeIdx].start,
      endTime: timeSlots[timeIdx].end,
      speaker: speakers[idx % speakers.length],
      location: locations[idx % locations.length],
      capacity: 200 + Math.floor(Math.random() * 300),
      registered: 50 + Math.floor(Math.random() * 200),
      tags
    });
  });

  workshopTitles.forEach((title, idx) => {
    const dateIdx = idx % dates.length;
    const timeIdx = (idx + 1) % (timeSlots.length - 1);
    const tags = [
      tagPool[(idx + 3) % tagPool.length],
      tagPool[(idx + 8) % tagPool.length]
    ];
    
    activities.push({
      id: uuidv4(),
      title,
      description: `动手实践${title}，通过实际项目掌握核心技能，配备专业导师全程指导。`,
      type: 'workshop',
      difficulty: difficulties[(idx + 1) % 3],
      date: dates[dateIdx],
      startTime: timeSlots[timeIdx].start,
      endTime: timeSlots[timeIdx + 1].end,
      speaker: speakers[(idx + 2) % speakers.length],
      location: locations[(idx + 3) % locations.length],
      capacity: 30 + Math.floor(Math.random() * 40),
      registered: 15 + Math.floor(Math.random() * 35),
      tags
    });
  });

  socialTitles.forEach((title, idx) => {
    const dateIdx = idx % dates.length;
    const tags = [tagPool[(idx + 15) % tagPool.length]];
    
    activities.push({
      id: uuidv4(),
      title,
      description: `${title}：与志同道合的技术人交流分享，拓展人脉，碰撞思想火花。`,
      type: 'social',
      difficulty: 'beginner',
      date: dates[dateIdx],
      startTime: idx % 2 === 0 ? '12:00' : '18:00',
      endTime: idx % 2 === 0 ? '13:00' : '19:30',
      speaker: speakers[(idx + 5) % speakers.length],
      location: locations[(idx + 5) % locations.length],
      capacity: 100 + Math.floor(Math.random() * 150),
      registered: 40 + Math.floor(Math.random() * 100),
      tags
    });
  });

  return activities;
}

export const mockActivities: Activity[] = generateActivities();

export function getActivityById(id: string): Activity | undefined {
  return mockActivities.find(a => a.id === id);
}

export function getActivitiesByDate(date: string): Activity[] {
  return mockActivities.filter(a => a.date === date);
}
