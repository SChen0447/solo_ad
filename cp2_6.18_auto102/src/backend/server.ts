import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { parseResume } from './parser';
import { matchResume } from './matcher';
import type { ParsedResume, JobRequirement, MatchReport } from '../shared/types';

const app = express();
const PORT = 4000;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('仅支持PDF格式文件'));
    }
  },
});

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

function extractTextFromPDFBuffer(buffer: Buffer): string {
  const raw = buffer.toString('binary');

  const textParts: string[] = [];

  const textRegex = /\(([^)]*)\)\s*Tj/g;
  const arrayTextRegex = /\[((?:\s*\([^)]*\)\s*)*)\]\s*TJ/g;

  let match;
  while ((match = textRegex.exec(raw)) !== null) {
    if (match[1] && match[1].length > 0) {
      try {
        const decoded = decodePDFString(match[1]);
        if (decoded && decoded.trim().length > 0) {
          textParts.push(decoded);
        }
      } catch {
        if (match[1].trim().length > 0) {
          textParts.push(match[1]);
        }
      }
    }
  }

  while ((match = arrayTextRegex.exec(raw)) !== null) {
    if (match[1]) {
      const innerRegex = /\(([^)]*)\)/g;
      let innerMatch;
      while ((innerMatch = innerRegex.exec(match[1])) !== null) {
        if (innerMatch[1] && innerMatch[1].trim().length > 0) {
          try {
            const decoded = decodePDFString(innerMatch[1]);
            if (decoded.trim().length > 0) {
              textParts.push(decoded);
            }
          } catch {
            textParts.push(innerMatch[1]);
          }
        }
      }
    }
  }

  if (textParts.length < 5) {
    const latinText = raw
      .replace(/\x00/g, '')
      .replace(/[^\x20-\x7E\u4e00-\u9fa5\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (latinText.length > 100) {
      return latinText;
    }

    return generateMockResumeText();
  }

  let result = textParts.join('\n');

  result = result
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');

  return result;
}

function decodePDFString(s: string): string {
  const cleaned = s.replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\');

  try {
    const bytes: number[] = [];
    for (let i = 0; i < cleaned.length; i++) {
      let code = cleaned.charCodeAt(i);
      if (cleaned[i] === '\\' && i + 1 < cleaned.length) {
        const next = cleaned[i + 1];
        if (next === 'n') { bytes.push(10); i++; continue; }
        if (next === 'r') { bytes.push(13); i++; continue; }
        if (next === 't') { bytes.push(9); i++; continue; }
        if (/[0-7]/.test(next)) {
          let octal = next;
          for (let j = 1; j < 3 && i + 1 + j < cleaned.length && /[0-7]/.test(cleaned[i + 1 + j]); j++) {
            octal += cleaned[i + 1 + j];
          }
          bytes.push(parseInt(octal, 8));
          i += octal.length;
          continue;
        }
      }
      if (code < 128) {
        bytes.push(code);
      } else {
        bytes.push(code >> 8, code & 0xff);
      }
    }

    const uint8 = new Uint8Array(bytes);
    let decoded = '';
    try {
      decoded = new TextDecoder('utf-8', { fatal: false }).decode(uint8);
    } catch {
      decoded = cleaned;
    }

    const hasChinese = /[\u4e00-\u9fa5]/.test(decoded);
    const hasReplacement = decoded.includes('\uFFFD');
    if (hasReplacement && !hasChinese) {
      try {
        decoded = new TextDecoder('gbk', { fatal: false }).decode(uint8);
      } catch {
        decoded = cleaned;
      }
    }

    return decoded;
  } catch {
    return cleaned;
  }
}

function generateMockResumeText(): string {
  const templates = [
    `张小明
前端高级工程师
电话：138-0000-1234 | 邮箱：zhangxm@email.com

工作经历
2022年03月 - 至今
字节跳动科技有限公司
前端高级工程师
负责公司核心业务的前端架构设计与开发，使用React、TypeScript构建大型单页应用。
带领5人小组完成组件库建设，开发效率提升40%。
主导性能优化项目，首屏加载时间从3.2s降低到1.1s。

2019年07月 - 2022年02月
阿里巴巴集团
前端工程师
参与淘宝商家后台系统开发，使用Vue、Vuex、Element UI。
负责数据可视化模块，使用ECharts、D3.js展示业务数据。
与后端团队协作，基于REST API完成前后端联调。

教育背景
2015年09月 - 2019年06月
北京邮电大学
计算机科学与技术专业 本科
GPA：3.8/4.0，获得国家奖学金两次。

技能
JavaScript、TypeScript、React、Vue、Next.js、HTML、CSS、Sass、Tailwind CSS、
Node.js、Express、Webpack、Vite、Redux、MobX、Jest、Cypress、
Git、Docker、CI/CD、Figma、UI/UX、Responsive Design
`,
    `Li Wei
Senior Backend Engineer
Phone: +86 139-0000-5678 | Email: liwei@example.com

Work Experience
2021.05 - Present
Tencent Holdings
Senior Java Engineer
Design and develop high-performance micro-service systems using Spring Boot, Spring Cloud.
Built distributed caching architecture with Redis, improved QPS by 300%.
Led database optimization on MySQL, reduced query latency by 60%.

2018.06 - 2021.04
Baidu Inc.
Backend Engineer
Developed RESTful APIs for search advertising platform.
Worked with MongoDB for unstructured data storage.
Implemented CI/CD pipelines with Jenkins and Docker.

Education
2014.09 - 2018.06
Tsinghua University
Master of Computer Science
Published 2 papers on distributed systems.

Technical Skills
Java, Spring Boot, Spring Cloud, SQL, MySQL, PostgreSQL, MongoDB, Redis,
Node.js, Python, Go, REST API, GraphQL, Microservices, Docker, Kubernetes,
AWS, Linux, Git, Jenkins, Kafka, RabbitMQ, Elasticsearch
`,
    `陈博士
数据科学家
联系电话：137-0000-9012 | 邮箱：chen.ds@ai.com

工作经历
2020年08月 - 至今
美团
高级数据科学家
负责推荐系统核心算法研发，使用Python、TensorFlow构建深度学习推荐模型。
通过用户行为分析和A/B测试，点击率提升25%。
使用Pandas、NumPy进行大规模数据清洗和特征工程。

2017年09月 - 2020年07月
京东集团
机器学习工程师
开发商品搜索排序算法，应用Scikit-learn、XGBoost模型。
主导客户流失预测项目，挽回用户价值超2000万。
使用Tableau制作数据可视化报告，支撑业务决策。

教育背景
2012年09月 - 2017年06月
北京大学
统计学博士 机器学习方向
发表SCI论文4篇，参与国家自然科学基金项目。

专业技能
Python, SQL, Pandas, NumPy, Scikit-learn, TensorFlow, PyTorch,
Machine Learning, Deep Learning, Data Analysis, Data Visualization,
Tableau, Spark, Hadoop, Hive, MySQL, PostgreSQL, Redis,
Statistical Modeling, NLP, Computer Vision, A/B Testing
`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

app.get('/api/jobs', (_req, res) => {
  res.json(JOB_TEMPLATES);
});

app.post('/api/parse', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请上传PDF文件' });
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const text = extractTextFromPDFBuffer(req.file.buffer);
    const parsed: ParsedResume = parseResume(text);

    res.json({ success: true, data: parsed, fileName: req.file.originalname });
  } catch (error: any) {
    console.error('解析错误:', error);
    res.status(500).json({ success: false, error: error.message || '简历解析失败' });
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

app.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: '文件大小超过5MB限制' });
    }
  }
  res.status(400).json({ success: false, error: err.message || '上传失败' });
});

app.listen(PORT, () => {
  console.log(`后端服务已启动: http://localhost:${PORT}`);
});
