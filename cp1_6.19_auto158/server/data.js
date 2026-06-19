import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'okrs.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    const initialData = generateInitialData();
    fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function generateInitialData() {
  const now = new Date();
  const currentQ = Math.floor(now.getMonth() / 3) + 1;
  const year = now.getFullYear();
  const quarter = `Q${currentQ} ${year}`;

  const checkins = generateCheckins();

  return [
    {
      id: 'okr-1',
      title: '提升产品用户体验',
      owner: '张伟',
      period: quarter,
      createdAt: new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString(),
      krs: [
        {
          id: 'kr-1',
          description: '产品NPS评分从40提升到60',
          owner: '李娜',
          dueDate: new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
          progress: 55,
          createdAt: new Date(now.getTime() - 28 * 24 * 3600 * 1000).toISOString(),
          checkins: checkins.slice(0, 6),
        },
        {
          id: 'kr-2',
          description: '页面加载速度优化50%',
          owner: '王强',
          dueDate: new Date(now.getTime() + 20 * 24 * 3600 * 1000).toISOString().split('T')[0],
          progress: 75,
          createdAt: new Date(now.getTime() - 25 * 24 * 3600 * 1000).toISOString(),
          checkins: checkins.slice(0, 8),
        },
        {
          id: 'kr-3',
          description: '用户反馈响应时间缩短至24小时内',
          owner: '赵敏',
          dueDate: new Date(now.getTime() + 45 * 24 * 3600 * 1000).toISOString().split('T')[0],
          progress: 40,
          createdAt: new Date(now.getTime() - 20 * 24 * 3600 * 1000).toISOString(),
          checkins: checkins.slice(0, 5),
        },
      ],
    },
    {
      id: 'okr-2',
      title: '扩大市场份额至15%',
      owner: '陈军',
      period: quarter,
      createdAt: new Date(now.getTime() - 25 * 24 * 3600 * 1000).toISOString(),
      krs: [
        {
          id: 'kr-4',
          description: '新增注册用户数达到50万',
          owner: '刘涛',
          dueDate: new Date(now.getTime() + 25 * 24 * 3600 * 1000).toISOString().split('T')[0],
          progress: 65,
          createdAt: new Date(now.getTime() - 22 * 24 * 3600 * 1000).toISOString(),
          checkins: checkins.slice(0, 7),
        },
        {
          id: 'kr-5',
          description: '月度活跃用户MAU增长30%',
          owner: '孙丽',
          dueDate: new Date(now.getTime() + 35 * 24 * 3600 * 1000).toISOString().split('T')[0],
          progress: 50,
          createdAt: new Date(now.getTime() - 18 * 24 * 3600 * 1000).toISOString(),
          checkins: checkins.slice(0, 6),
        },
      ],
    },
    {
      id: 'okr-3',
      title: '建立高效研发流程',
      owner: '周杰',
      period: quarter,
      createdAt: new Date(now.getTime() - 20 * 24 * 3600 * 1000).toISOString(),
      krs: [
        {
          id: 'kr-6',
          description: '代码测试覆盖率达到80%',
          owner: '吴昊',
          dueDate: new Date(now.getTime() + 40 * 24 * 3600 * 1000).toISOString().split('T')[0],
          progress: 60,
          createdAt: new Date(now.getTime() - 15 * 24 * 3600 * 1000).toISOString(),
          checkins: checkins.slice(0, 5),
        },
        {
          id: 'kr-7',
          description: '版本发布周期从2周缩短至1周',
          owner: '郑琳',
          dueDate: new Date(now.getTime() + 50 * 24 * 3600 * 1000).toISOString().split('T')[0],
          progress: 30,
          createdAt: new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString(),
          checkins: checkins.slice(0, 4),
        },
        {
          id: 'kr-8',
          description: '生产环境重大故障为0',
          owner: '黄磊',
          dueDate: new Date(now.getTime() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
          progress: 85,
          createdAt: new Date(now.getTime() - 12 * 24 * 3600 * 1000).toISOString(),
          checkins: checkins.slice(0, 9),
        },
      ],
    },
  ];
}

function generateCheckins() {
  const now = new Date();
  const checkins = [];
  let progress = 0;
  for (let i = 29; i >= 0; i -= 3) {
    progress = Math.min(100, progress + Math.floor(Math.random() * 10) + 2);
    const date = new Date(now.getTime() - i * 24 * 3600 * 1000);
    checkins.push({
      id: `checkin-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: date.toISOString(),
      comment: getRandomComment(),
      progressDelta: Math.floor(Math.random() * 10),
      progressValue: progress,
    });
  }
  return checkins;
}

function getRandomComment() {
  const comments = [
    '本周进展顺利，完成了核心功能开发',
    '遇到了一些技术挑战，正在积极解决中',
    '团队协作良好，进度符合预期',
    '需要更多资源支持，已与相关方沟通',
    '已完成阶段性目标，准备下一阶段工作',
    '需求有变更，需要调整计划',
    '用户反馈良好，继续优化体验',
    '性能优化取得突破，指标明显改善',
    '完成了文档编写和知识沉淀',
    '与其他团队对齐了合作方案',
  ];
  return comments[Math.floor(Math.random() * comments.length)];
}

export function readOkrs() {
  ensureDataDir();
  const raw = fs.readFileSync(dataFile, 'utf-8');
  return JSON.parse(raw);
}

export function writeOkrs(data) {
  ensureDataDir();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}
