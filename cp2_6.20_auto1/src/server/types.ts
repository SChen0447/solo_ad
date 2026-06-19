export interface Education {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  skills: string[];
}

export interface Skill {
  name: string;
  count: number;
  contexts: string[];
}

export interface ParsedResume {
  id: string;
  rawText: string;
  education: Education[];
  skills: Skill[];
  projects: Project[];
}

export interface SkillMatch {
  skill: string;
  required: boolean;
  score: number;
  count: number;
  contexts: string[];
}

export interface MatchResult {
  overallScore: number;
  skills: SkillMatch[];
}

export interface JobRequirement {
  id: string;
  name: string;
  skills: string[];
}

export const JOB_TEMPLATES: JobRequirement[] = [
  {
    id: 'frontend',
    name: '前端工程师',
    skills: [
      'React', 'Vue', 'TypeScript', 'JavaScript', 'HTML', 'CSS',
      'Webpack', 'Vite', 'Node.js', 'Git', 'Redux', '响应式设计',
      '性能优化', '单元测试', 'RESTful API'
    ]
  },
  {
    id: 'data-analyst',
    name: '数据分析师',
    skills: [
      'Python', 'SQL', 'Excel', 'Tableau', '机器学习', '统计学',
      '数据可视化', 'Pandas', 'NumPy', 'Scikit-learn', 'ETL',
      'A/B测试', '数据挖掘', 'Hadoop', 'Spark'
    ]
  },
  {
    id: 'product-manager',
    name: '产品经理',
    skills: [
      '需求分析', '产品设计', '用户体验', '原型设计', 'Axure',
      'Figma', '项目管理', '敏捷开发', '数据分析', '用户调研',
      '竞品分析', 'PRD', '商业模式', '增长黑客', 'OKR'
    ]
  }
];
