import type { MatchResult, SkillMatch, JobTemplate, ParsedResume } from '../types';

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: 'frontend',
    name: '前端工程师',
    requiredSkills: [
      'React', 'Vue', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3',
      'Node.js', 'Webpack', 'Vite', 'Git', 'RESTful', 'Redux',
      '小程序', '性能优化', 'Jest'
    ],
    relatedKeywords: {
      'React': ['React Hooks', 'React Router', 'Suspense', 'Server Components', 'Next.js'],
      'Vue': ['Vue 3', 'Composition API', 'Pinia', 'Nuxt 3', 'Volar'],
      'TypeScript': ['Generic', 'Type Utility', 'Zod', 'tsc', 'Strict Mode'],
      'JavaScript': ['ES6+', 'Promise', 'Async/Await', 'Closure', 'Prototype'],
      'HTML5': ['Semantic HTML', 'Canvas', 'Web Audio', 'LocalStorage', 'PWA'],
      'CSS3': ['Flexbox', 'Grid', 'BEM', 'CSS Modules', 'Tailwind CSS'],
      'Node.js': ['Express', 'Koa', 'NestJS', 'PM2', 'Event Loop'],
      'Webpack': ['Loader', 'Plugin', 'Tree Shaking', 'Code Splitting', 'HMR'],
      'Vite': ['ESBuild', 'Rollup', 'HMR API', 'Plugin API', 'Optimized Deps'],
      'Git': ['Git Flow', 'Rebase', 'Cherry-pick', 'Submodule', 'Bisect'],
      'RESTful': ['HTTP/2', 'JWT', 'OpenAPI', 'Postman', 'Swagger'],
      'Redux': ['Redux Toolkit', 'RTK Query', 'Thunk', 'Saga', 'Selector'],
      '小程序': ['WXML', 'WXSS', 'App Service', '云开发', '微信支付'],
      '性能优化': ['LCP', 'FID', 'CLS', 'Lazy Load', 'Memoization'],
      'Jest': ['Vitest', 'Testing Library', 'Mock', 'Snapshot', 'Coverage']
    }
  },
  {
    id: 'data',
    name: '数据分析师',
    requiredSkills: [
      'Python', 'SQL', 'Excel', 'Tableau', 'R', '统计学',
      '机器学习', '数据可视化', 'Pandas', 'NumPy', 'ETL',
      'A/B Testing', 'Power BI', 'SQLite'
    ],
    relatedKeywords: {
      'Python': ['NumPy', 'Pandas', 'Matplotlib', 'Seaborn', 'Jupyter'],
      'SQL': ['JOIN', 'Window Function', 'CTE', 'Index', 'Query Optimize'],
      'Excel': ['Pivot Table', 'VLOOKUP', 'Power Query', '宏', 'Solver'],
      'Tableau': ['Dashboard', 'Lod', 'Set', 'Parameter', 'Extract'],
      'R': ['ggplot2', 'dplyr', 'tidyverse', 'Shiny', 'R Markdown'],
      '统计学': ['假设检验', '置信区间', '回归分析', '贝叶斯', '分布'],
      '机器学习': ['特征工程', '过拟合', '交叉验证', '混淆矩阵', 'AUC'],
      '数据可视化': ['D3.js', 'ECharts', '热力图', '桑基图', '箱线图'],
      'Pandas': ['DataFrame', 'GroupBy', 'Apply', 'Merge', 'Resample'],
      'NumPy': ['Array', 'Broadcasting', 'Vectorize', 'Mask', 'Linear Algebra'],
      'ETL': ['Airflow', 'Data Warehouse', 'Data Lake', 'Snowflake', 'Redshift'],
      'A/B Testing': ['显著性', '样本量', '分流', 'MDE', 'SRM'],
      'Power BI': ['DAX', 'Power Query', 'Dashboard', 'Data Model', 'Gateway'],
      'SQLite': ['索引', '事务', 'WAL', 'VACUUM', 'EXPLAIN']
    }
  },
  {
    id: 'pm',
    name: '产品经理',
    requiredSkills: [
      '产品设计', '需求分析', '用户研究', 'Axure', '竞品分析',
      '项目管理', '数据分析', '原型设计', '交互设计', '敏捷开发',
      'PRD', '用户体验', 'Figma', 'Scrum'
    ],
    relatedKeywords: {
      '产品设计': ['MVP', '用户画像', '用户旅程', '痛点分析', '价值主张'],
      '需求分析': ['KANO模型', 'MoSCoW', '需求池', '优先级', '可行性'],
      '用户研究': ['用户访谈', '问卷调查', '可用性测试', '焦点小组', '数据分析'],
      'Axure': ['RP 10', '元件库', '动态面板', '中继器', '自适应视图'],
      '竞品分析': ['SWOT', '功能对比', '差异化', '市场定位', '商业模式'],
      '项目管理': ['WBS', '甘特图', '里程碑', '风险管理', '资源规划'],
      '数据分析': ['漏斗分析', '留存分析', '用户分群', 'Cohort', '北极星指标'],
      '原型设计': ['低保真', '高保真', '交互规范', '信息架构', '流程图'],
      '交互设计': ['费茨定律', '格式塔', '尼尔森原则', '微交互', '动效'],
      '敏捷开发': ['Sprint', 'Backlog', 'Daily Standup', 'Review', 'Retro'],
      'PRD': ['文档结构', '用例', '验收标准', '流程图', '边界条件'],
      '用户体验': ['可用性', '易用性', '情感化设计', '无障碍', '一致性'],
      'Figma': ['组件库', 'Auto Layout', '变体', '原型链接', 'Dev Mode'],
      'Scrum': ['PO', 'SM', '故事点', '燃尽图', 'Sprint Planning']
    }
  }
];

const parseCache = new Map<string, MatchResult>();

export function calculateSkillMatch(
  parsedResume: ParsedResume,
  jobId: string
): MatchResult {
  const cacheKey = `${parsedResume.id}_${jobId}`;
  const cached = parseCache.get(cacheKey);
  if (cached) return cached;

  const job = JOB_TEMPLATES.find(j => j.id === jobId);
  if (!job) {
    throw new Error(`Job template ${jobId} not found`);
  }

  const { skills: resumeSkills, skillOccurrences, skillContexts, rawText } = parsedResume;

  const resumeSkillFreq = new Map<string, number>();
  for (const skill of resumeSkills) {
    resumeSkillFreq.set(skill, skillOccurrences[skill] || 1);
  }

  const docLength = rawText.length || 1;
  const totalDocs = 1;

  const skillsResult: SkillMatch[] = job.requiredSkills.map(requiredSkill => {
    let baseScore = 0;
    let occurrences = 0;
    const contexts: string[] = [];

    const exactFreq = resumeSkillFreq.get(requiredSkill);
    if (exactFreq) {
      occurrences = exactFreq;
      const tf = exactFreq / docLength * 10000;
      const idf = Math.log((totalDocs + 1) / 1) + 1;
      baseScore = Math.min(100, tf * idf * 50 + 40);
      const ctxs = skillContexts[requiredSkill];
      if (ctxs) contexts.push(...ctxs.slice(0, 3));
    }

    const lowerRequired = requiredSkill.toLowerCase();
    for (const [resumeSkill, freq] of resumeSkillFreq) {
      if (resumeSkill.toLowerCase() === lowerRequired) continue;
      const lowerResume = resumeSkill.toLowerCase();
      const partialMatch = lowerRequired.includes(lowerResume) || lowerResume.includes(lowerRequired);
      if (partialMatch) {
        baseScore = Math.max(baseScore, Math.min(75, freq * 15 + 20));
        if (occurrences === 0) occurrences = freq;
      }
    }

    if (baseScore === 0) {
      const rawCount = countSubstring(rawText.toLowerCase(), lowerRequired);
      if (rawCount > 0) {
        baseScore = Math.min(100, rawCount * 25 + 10);
        occurrences = rawCount;
      }
    }

    baseScore = Math.round(Math.min(100, Math.max(0, baseScore)));

    const suggestedKeywords = (job.relatedKeywords[requiredSkill] || []).filter(kw => {
      return !rawText.toLowerCase().includes(kw.toLowerCase());
    }).slice(0, 4);

    return {
      skill: requiredSkill,
      score: baseScore,
      occurrences,
      contexts: contexts.length > 0 ? contexts : extractContexts(rawText, requiredSkill),
      suggestedKeywords,
    };
  });

  const overallScore = Math.round(
    skillsResult.reduce((sum, s) => sum + s.score, 0) / skillsResult.length
  );

  const result: MatchResult = {
    overallScore,
    skills: skillsResult,
    jobId,
  };

  if (parseCache.size > 100) {
    const firstKey = parseCache.keys().next().value;
    if (firstKey) parseCache.delete(firstKey);
  }
  parseCache.set(cacheKey, result);

  return result;
}

function countSubstring(str: string, sub: string): number {
  if (sub.length === 0) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = str.indexOf(sub, idx)) !== -1) {
    count++;
    idx += sub.length;
    if (count > 50) break;
  }
  return count;
}

function extractContexts(text: string, keyword: string): string[] {
  const lowerText = text.toLowerCase();
  const lowerKw = keyword.toLowerCase();
  const contexts: string[] = [];
  let idx = 0;
  while ((idx = lowerText.indexOf(lowerKw, idx)) !== -1) {
    const start = Math.max(0, idx - 20);
    const end = Math.min(text.length, idx + keyword.length + 20);
    let ctx = text.slice(start, end);
    ctx = (start > 0 ? '...' : '') + ctx.trim() + (end < text.length ? '...' : '');
    contexts.push(ctx);
    idx += keyword.length;
    if (contexts.length >= 3) break;
  }
  return contexts;
}

export function getJobTemplates(): JobTemplate[] {
  return JOB_TEMPLATES.map(({ id, name, requiredSkills }) => ({
    id, name, requiredSkills, relatedKeywords: {},
  }));
}
