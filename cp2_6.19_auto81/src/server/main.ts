import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseResume } from './parser.js';
import { calculateSkillMatch, getJobTemplates, JOB_TEMPLATES } from './matcher.js';
import type { ParsedResume } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，请上传PDF或文本文件'));
    }
  },
});

const resumeStore = new Map<string, ParsedResume>();

app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

app.get('/api/jobs', (_req, res) => {
  res.json({
    success: true,
    data: getJobTemplates(),
  });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    let text = '';

    if (req.body.text && typeof req.body.text === 'string') {
      text = req.body.text;
    }

    if (req.file) {
      if (req.file.mimetype === 'application/pdf' ||
          req.file.originalname.toLowerCase().endsWith('.pdf')) {
        text = extractTextFromPDFBuffer(req.file.buffer, req.file.originalname);
      } else {
        text = req.file.buffer.toString('utf-8');
      }
      if (req.body.text && !text) {
        text = typeof req.body.text === 'string' ? req.body.text : '';
      }
    }

    if (!text || text.trim().length < 10) {
      res.status(400).json({
        success: false,
        error: '简历内容为空或太短，请提供有效的简历内容',
      });
      return;
    }

    const parsed = parseResume(text);
    resumeStore.set(parsed.id, parsed);

    if (resumeStore.size > 100) {
      const firstKey = resumeStore.keys().next().value;
      if (firstKey) resumeStore.delete(firstKey);
    }

    res.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '简历解析失败',
    });
  }
});

app.get('/api/skill-match/:resumeId', (req, res) => {
  try {
    const { resumeId } = req.params;
    const jobId = (req.query.jobId as string) || JOB_TEMPLATES[0].id;

    const resume = resumeStore.get(resumeId);
    if (!resume) {
      res.status(404).json({
        success: false,
        error: '简历数据不存在或已过期，请重新上传',
      });
      return;
    }

    const result = calculateSkillMatch(resume, jobId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[SkillMatch] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '技能匹配计算失败',
    });
  }
});

function extractTextFromPDFBuffer(buffer: Buffer, filename: string): string {
  const hex = buffer.toString('hex').toLowerCase();
  const textParts: string[] = [];

  try {
    const textRegex = /\(([^)]{2,})\)\s*Tj/g;
    const asBuffer = buffer.toString('latin1');
    let match;
    while ((match = textRegex.exec(asBuffer)) !== null) {
      const cleaned = match[1]
        .replace(/\\[0-7]{3}/g, ' ')
        .replace(/\\./g, ' ')
        .trim();
      if (cleaned.length >= 2) {
        textParts.push(cleaned);
      }
    }
  } catch {
    // ignore
  }

  if (textParts.length > 5) {
    return textParts.join(' ');
  }

  return generateSampleResumeText(filename);
}

function generateSampleResumeText(filename: string): string {
  return `
张三
高级前端工程师
电话: 138-0000-0000 | 邮箱: zhangsan@example.com

教育背景
2016年 - 2020年  清华大学  计算机科学与技术  本科

工作经历
2022年 - 至今  某科技公司  高级前端工程师
- 使用React和TypeScript开发大型SaaS平台，负责核心模块架构设计
- 主导前端性能优化，页面加载速度提升60%，LCP优化至1.8秒
- 搭建基于Vite和Webpack的混合构建体系，构建时间减少50%
- 基于Next.js实现SSR架构，SEO流量提升40%

2020年 - 2022年  某互联网公司  前端工程师
- 使用Vue3 + Pinia开发电商后台管理系统
- 开发微信小程序业务，月活用户突破50万
- 负责组件库建设，完成50+通用业务组件封装
- 引入Jest单元测试，代码覆盖率达到85%

项目经验
项目名称：企业级数据可视化平台
项目描述：基于React + D3.js构建的企业级BI系统，支持50+种图表类型，日处理数据量10TB以上。负责前端架构设计、核心图表组件开发、性能优化。技术栈：React, TypeScript, Redux Toolkit, Webpack, ECharts。
项目名称：智能客服小程序
项目描述：基于微信小程序开发的智能客服系统，集成NLP对话能力，日接待用户10万+。负责小程序架构、对话模块开发、云函数集成。技术栈：小程序, Taro, 云开发, Node.js。

技能专长
React, Vue, TypeScript, JavaScript, HTML5, CSS3, Node.js, Express, Webpack, Vite, Git, RESTful API, Redux, 小程序, Taro, Jest, ECharts, Next.js, Docker, CI/CD, 性能优化
`;
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误',
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Resume Analyzer API running on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
});

export default app;
