import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Feedback,
  Status,
  FeedbackType,
  Note,
  FeedbackListResponse,
  CreateFeedbackRequest,
  UpdateStatusRequest,
  AddNoteRequest,
  TrendDataPoint,
  TypeDistribution,
} from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

function readData(): Feedback[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const sampleData: Feedback[] = generateSampleData();
      writeData(sampleData);
      return sampleData;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    const sampleData: Feedback[] = generateSampleData();
    writeData(sampleData);
    return sampleData;
  }
}

function writeData(data: Feedback[]): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function generateSampleData(): Feedback[] {
  const now = new Date();
  const types: FeedbackType[] = [FeedbackType.FEATURE, FeedbackType.BUG, FeedbackType.OTHER];
  const statuses: Status[] = [Status.PENDING, Status.IN_PROGRESS, Status.COMPLETED, Status.CLOSED];
  const sampleTitles = [
    '希望增加深色模式',
    '登录页面崩溃',
    '导出功能异常',
    '建议优化搜索算法',
    '移动端适配问题',
    '需要API文档',
    '按钮颜色建议',
    '数据加载缓慢',
    '支持多语言',
    '报错信息不明确',
    '增加快捷键支持',
    '表格排序功能',
    '图片上传失败',
    '用户权限管理',
    '消息通知功能',
  ];

  const data: Feedback[] = [];

  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 14);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const feedback: Feedback = {
      id: uuidv4(),
      title: sampleTitles[i % sampleTitles.length],
      type: types[Math.floor(Math.random() * types.length)],
      description: `这是一条示例反馈描述。详细说明了用户遇到的问题或提出的建议。${i}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: date.toISOString(),
      notes: i % 3 === 0 ? [
        {
          id: uuidv4(),
          author: '管理员',
          content: '已收到反馈，正在评估中。',
          createdAt: new Date(date.getTime() + 3600000).toISOString(),
        },
      ] : [],
    };
    data.push(feedback);
  }

  return data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

app.post('/api/feedback', (req: Request<{}, {}, CreateFeedbackRequest>, res: Response<Feedback>) => {
  const { title, type, description } = req.body;

  if (!title || !title.trim()) {
    res.status(400).json({ error: '标题不能为空' } as any);
    return;
  }

  if (!description || !description.trim()) {
    res.status(400).json({ error: '描述不能为空' } as any);
    return;
  }

  if (!Object.values(FeedbackType).includes(type)) {
    res.status(400).json({ error: '无效的反馈类型' } as any);
    return;
  }

  const feedback: Feedback = {
    id: uuidv4(),
    title: title.trim(),
    type,
    description: description.trim(),
    status: Status.PENDING,
    createdAt: new Date().toISOString(),
    notes: [],
  };

  const data = readData();
  data.unshift(feedback);
  writeData(data);

  res.status(201).json(feedback);
});

app.get('/api/feedback', (req: Request, res: Response<FeedbackListResponse>) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const type = req.query.type as string;
  const status = req.query.status as string;

  let data = readData();

  if (type && type !== 'all') {
    data = data.filter((f) => f.type === type);
  }

  if (status && status !== 'all') {
    data = data.filter((f) => f.status === status);
  }

  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  res.json({
    data: paginatedData,
    total,
    page,
    pageSize,
    totalPages,
  });
});

app.put('/api/feedback/:id/status', (req: Request<{ id: string }, {}, UpdateStatusRequest>, res: Response<Feedback>) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!Object.values(Status).includes(status)) {
    res.status(400).json({ error: '无效的状态' } as any);
    return;
  }

  const data = readData();
  const index = data.findIndex((f) => f.id === id);

  if (index === -1) {
    res.status(404).json({ error: '反馈不存在' } as any);
    return;
  }

  data[index].status = status;
  writeData(data);

  res.json(data[index]);
});

app.post('/api/feedback/:id/notes', (req: Request<{ id: string }, {}, AddNoteRequest>, res: Response<Feedback>) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim() || content.length > 500) {
    res.status(400).json({ error: '备注内容长度必须在1-500字之间' } as any);
    return;
  }

  const data = readData();
  const index = data.findIndex((f) => f.id === id);

  if (index === -1) {
    res.status(404).json({ error: '反馈不存在' } as any);
    return;
  }

  const note: Note = {
    id: uuidv4(),
    author: '管理员',
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  data[index].notes.push(note);
  writeData(data);

  res.json(data[index]);
});

app.get('/api/statistics/trend', (_req: Request, res: Response<TrendDataPoint[]>) => {
  const data = readData();
  const trend: Map<string, number> = new Map();

  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    trend.set(dateStr, 0);
  }

  data.forEach((feedback) => {
    const dateStr = new Date(feedback.createdAt).toISOString().split('T')[0];
    if (trend.has(dateStr)) {
      trend.set(dateStr, (trend.get(dateStr) || 0) + 1);
    }
  });

  const result: TrendDataPoint[] = Array.from(trend.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  res.json(result);
});

app.get('/api/statistics/type-distribution', (_req: Request, res: Response<TypeDistribution[]>) => {
  const data = readData();
  const distribution: Record<FeedbackType, number> = {
    [FeedbackType.FEATURE]: 0,
    [FeedbackType.BUG]: 0,
    [FeedbackType.OTHER]: 0,
  };

  data.forEach((feedback) => {
    distribution[feedback.type]++;
  });

  const typeNames: Record<FeedbackType, string> = {
    [FeedbackType.FEATURE]: '功能建议',
    [FeedbackType.BUG]: 'Bug报告',
    [FeedbackType.OTHER]: '其他',
  };

  const result: TypeDistribution[] = Object.entries(distribution).map(([type, count]) => ({
    type: type as FeedbackType,
    count,
    name: typeNames[type as FeedbackType],
  }));

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
