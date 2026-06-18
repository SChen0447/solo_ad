import express from 'express';
import cors from 'cors';
import { parseResume } from './parser';
import { matchResume } from './matcher';
import type { ParsedResume, JobRequirement, MatchReport } from '../shared/types';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const JOB_TEMPLATES: JobRequirement[] = [
  {
    id: 'frontend',
    title: '前端工程师',
    description: '负责公司Web产品的前端开发工作，参与产品需求分析和技术方案设计，优化用户体验和页面性能。',
    requiredSkills: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS'],
    preferredSkills: ['Vue', 'Next.js', 'Webpack', 'Vite', 'Tailwind CSS', 'Node.js', 'Redux'],
    experience: '2年以上前端开发经验',
    education: '本科及以上学历，计算机相关专业优先',
  },
  {
    id: 'backend',
    title: '后端工程师',
    description: '负责公司服务端系统的设计与开发，保障系统的高可用性、高性能和可扩展性，参与技术架构设计。',
    requiredSkills: ['Java', 'Spring Boot', 'SQL', 'MySQL', 'REST API'],
    preferredSkills: ['Node.js', 'Python', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'Microservices'],
    experience: '3年以上后端开发经验',
    education: '本科及以上学历，计算机相关专业',
  },
  {
    id: 'datascientist',
    title: '数据科学家',
    description: '负责数据分析、建模和机器学习算法研发，挖掘业务价值，支撑数据驱动决策。',
    requiredSkills: ['Python', 'SQL', 'Pandas', 'NumPy', 'Machine Learning'],
    preferredSkills: ['TensorFlow', 'PyTorch', 'Scikit-learn', 'Data Analysis', 'Data Visualization', 'Tableau', 'Deep Learning'],
    experience: '2年以上数据分析或机器学习相关经验',
    education: '硕士及以上学历，统计学、数学、计算机相关专业',
  },
];

app.get('/api/jobs', (_req, res) => {
  res.json(JOB_TEMPLATES);
});

app.post('/api/parse', async (req, res) => {
  try {
    const { text } = req.body as { text: string };
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '缺少简历文本内容' });
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const parsed: ParsedResume = parseResume(text);
    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('解析错误:', error);
    res.status(500).json({ success: false, error: '简历解析失败' });
  }
});

app.post('/api/match', async (req, res) => {
  try {
    const { resume, jobId } = req.body as { resume: ParsedResume; jobId: string };
    if (!resume || !jobId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const job = JOB_TEMPLATES.find(j => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: '未找到该职位模板' });
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const report: MatchReport = matchResume(resume, job);
    res.json({ success: true, data: report, job });
  } catch (error) {
    console.error('匹配错误:', error);
    res.status(500).json({ success: false, error: '匹配计算失败' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务已启动: http://localhost:${PORT}`);
});
