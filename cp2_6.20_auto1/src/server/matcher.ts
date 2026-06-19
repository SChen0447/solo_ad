import { Skill, SkillMatch, MatchResult, JobRequirement } from './types';

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

function calculateTF(term: string, tokens: string[]): number {
  const termLower = term.toLowerCase();
  const count = tokens.filter(t => t === termLower || t.includes(termLower)).length;
  return count / tokens.length;
}

function calculateIDF(term: string, documents: string[][]): number {
  const termLower = term.toLowerCase();
  const docCount = documents.filter(doc => 
    doc.some(t => t === termLower || t.includes(termLower))
  ).length;
  return Math.log((documents.length + 1) / (docCount + 1)) + 1;
}

export function calculateSkillMatch(
  resumeSkills: Skill[],
  jobRequirement: JobRequirement
): MatchResult {
  const startTime = Date.now();

  const allContexts = resumeSkills.flatMap(s => s.contexts);
  const documents = [
    ...allContexts.map(c => tokenize(c)),
    ...resumeSkills.map(s => tokenize(s.name))
  ];

  const skillMatches: SkillMatch[] = jobRequirement.skills.map(requiredSkill => {
    const resumeSkill = resumeSkills.find(
      s => s.name.toLowerCase() === requiredSkill.toLowerCase()
    );

    if (resumeSkill) {
      const tokens = tokenize(resumeSkill.contexts.join(' ') + ' ' + resumeSkill.name);
      const tf = calculateTF(requiredSkill, tokens);
      const idf = calculateIDF(requiredSkill, documents);
      const tfidf = tf * idf;

      const baseScore = Math.min(100, resumeSkill.count * 20);
      const tfidfBonus = Math.min(30, tfidf * 100);
      const finalScore = Math.min(100, Math.round(baseScore + tfidfBonus));

      return {
        skill: requiredSkill,
        required: true,
        score: finalScore,
        count: resumeSkill.count,
        contexts: resumeSkill.contexts
      };
    } else {
      return {
        skill: requiredSkill,
        required: true,
        score: 0,
        count: 0,
        contexts: []
      };
    }
  });

  const matchedSkills = skillMatches.filter(s => s.score > 0);
  const totalScore = skillMatches.reduce((sum, s) => sum + s.score, 0);
  const overallScore = skillMatches.length > 0 
    ? Math.round(totalScore / skillMatches.length)
    : 0;

  const result: MatchResult = {
    overallScore,
    skills: skillMatches
  };

  const duration = Date.now() - startTime;
  console.log(`[Matcher] Skill matching completed in ${duration}ms, overall score: ${overallScore}`);

  return result;
}

export function getSuggestedKeywords(missingSkill: string, jobSkills: string[]): string[] {
  const suggestions: Record<string, string[]> = {
    'React': ['React Hooks', 'React Router', 'React Context', 'Next.js', 'SSR', '虚拟DOM', '组件化'],
    'Vue': ['Vue 3', 'Vue Router', 'Pinia', 'Composition API', 'Nuxt.js', '响应式原理'],
    'TypeScript': ['泛型', '类型守卫', '装饰器', '接口', '类型别名', 'tsconfig'],
    'JavaScript': ['ES6+', 'Promise', 'async/await', '闭包', '原型链', '事件循环'],
    'Node.js': ['Express', 'Koa', 'NestJS', '中间件', 'WebSocket', 'PM2'],
    'Python': ['Django', 'Flask', 'FastAPI', '异步编程', '装饰器', '生成器'],
    'SQL': ['索引优化', '事务', 'JOIN', '视图', '存储过程', '查询优化'],
    'Git': ['Git Flow', '分支管理', 'Merge', 'Rebase', 'Code Review', 'CI/CD'],
    'Docker': ['容器化', '镜像', 'Docker Compose', 'Kubernetes', 'DevOps'],
    'Redux': ['Redux Toolkit', '状态管理', 'Middleware', 'Thunk', 'Saga'],
    'Webpack': ['模块打包', 'Loader', 'Plugin', 'Tree Shaking', '代码分割'],
    'Vite': ['ESM', 'HMR', 'Rollup', '构建优化', '依赖预构建'],
    '机器学习': ['监督学习', '无监督学习', '神经网络', '特征工程', '模型评估'],
    '数据可视化': ['ECharts', 'D3.js', '图表设计', '交互设计', '数据叙事'],
    'Tableau': ['仪表板', '数据连接', '计算字段', 'LOD表达式', '地图可视化'],
    'Excel': ['数据透视表', 'VLOOKUP', '宏', 'Power Query', '条件格式'],
    'Pandas': ['DataFrame', '数据清洗', '分组聚合', '时间序列', 'merge'],
    'NumPy': ['数组运算', '矩阵运算', '广播机制', '随机数生成', '线性代数'],
    'Scikit-learn': ['分类', '回归', '聚类', '模型选择', '特征提取'],
    '需求分析': ['用户故事', '用例图', '需求评审', '需求优先级', 'MVP'],
    '产品设计': ['信息架构', '交互设计', '视觉设计', '设计系统', '可用性测试'],
    '用户体验': ['用户研究', '可用性测试', '用户画像', '用户旅程', '同理心地图'],
    '原型设计': ['低保真原型', '高保真原型', '交互原型', '可用性走查'],
    'Axure': ['元件库', '动态面板', '中继器', '函数', '自适应视图'],
    'Figma': ['组件库', 'Auto Layout', '变体', '原型交互', '协作'],
    '项目管理': ['WBS', '甘特图', '关键路径', '风险管理', '资源分配'],
    '敏捷开发': ['Scrum', 'Sprint', '站会', '迭代', '燃尽图'],
    '数据分析': ['描述性统计', '推断性统计', '相关性分析', '回归分析'],
    '用户调研': ['问卷调查', '用户访谈', '焦点小组', '可用性测试', '行为数据'],
    '竞品分析': ['SWOT分析', '功能对比', '用户评价', '市场定位', '差异化']
  };

  return suggestions[missingSkill] || [
    `${missingSkill}基础`,
    `${missingSkill}进阶`,
    `${missingSkill}实战`,
    `${missingSkill}最佳实践`,
    `${missingSkill}性能优化`
  ];
}
