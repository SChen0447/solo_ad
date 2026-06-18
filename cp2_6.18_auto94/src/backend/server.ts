import express from 'express';
import cors from 'cors';
import { parseResume } from './parser';
import { matchResume } from './matcher';
import type { ParsedResume, JobRequirement, MatchReport } from './types';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JOB_TEMPLATES: JobRequirement[] = [
  {
    id: 'frontend',
    title: '前端工程师',
    description: '负责公司产品的前端开发工作，包括Web应用和小程序的设计与实现，与后端工程师协作完成产品功能。',
    requiredSkills: ['javascript', 'typescript', 'react', 'html', 'css'],
    preferredSkills: ['vue', 'webpack', 'vite', 'node.js', 'jest', 'sass'],
    experienceYears: 2,
    educationLevel: '本科',
  },
  {
    id: 'backend',
    title: '后端工程师',
    description: '负责公司服务端系统的设计与开发，构建高性能、可扩展的后端服务，保障系统稳定运行。',
    requiredSkills: ['java', 'mysql', 'redis', 'spring', 'linux'],
    preferredSkills: ['node.js', 'mongodb', 'docker', 'kubernetes', 'kafka', 'elasticsearch'],
    experienceYears: 3,
    educationLevel: '本科',
  },
  {
    id: 'datascience',
    title: '数据科学家',
    description: '负责数据分析与挖掘工作，构建机器学习模型，为业务决策提供数据支持，推动数据驱动的产品优化。',
    requiredSkills: ['python', '机器学习', '数据分析', 'pandas', 'numpy'],
    preferredSkills: ['tensorflow', 'pytorch', '深度学习', 'spark', 'hadoop', '自然语言处理'],
    experienceYears: 2,
    educationLevel: '硕士',
  },
];

app.get('/api/jobs', (_req, res) => {
  res.json(JOB_TEMPLATES);
});

app.post('/api/parse', (req, res) => {
  const { text } = req.body as { text?: string };

  setTimeout(() => {
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '缺少简历文本内容' });
    }

    try {
      const parsed: ParsedResume = parseResume(text);
      res.json(parsed);
    } catch (error) {
      console.error('解析失败:', error);
      res.status(500).json({ error: '简历解析失败' });
    }
  }, 200);
});

app.post('/api/match', (req, res) => {
  const { resume, jobId } = req.body as { resume?: ParsedResume; jobId?: string };

  setTimeout(() => {
    if (!resume || !jobId) {
      return res.status(400).json({ error: '缺少简历数据或职位ID' });
    }

    const job = JOB_TEMPLATES.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: '未找到对应的职位模板' });
    }

    try {
      const report: MatchReport = matchResume(resume, job);
      res.json({ report, job });
    } catch (error) {
      console.error('匹配失败:', error);
      res.status(500).json({ error: '匹配计算失败' });
    }
  }, 200);
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`简历解析服务已启动: http://localhost:${PORT}`);
});
