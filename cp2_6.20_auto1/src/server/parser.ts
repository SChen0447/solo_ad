import { Education, Skill, Project, ParsedResume } from './types';

const DEGREE_PATTERNS = ['博士', '硕士', '本科', '大专', '高中', 'PhD', 'Master', 'Bachelor', 'MBA'];
const SCHOOL_PATTERNS = ['大学', '学院', 'University', 'College', 'Institute', 'Academy'];

function extractDates(text: string): { start: string; end: string; raw: string }[] {
  const datePatterns = [
    /(\d{4})\s*[-–~至]\s*(\d{4}|\d{2}|至今|现在|Present|Now)/g,
    /(\d{4}\.\d{1,2})\s*[-–~至]\s*(\d{4}\.\d{1,2}|至今|现在|Present|Now)/g,
    /(\d{4}年\d{1,2}月)\s*[-–~至]\s*(\d{4}年\d{1,2}月|至今|现在|Present|Now)/g,
  ];

  const results: { start: string; end: string; raw: string }[] = [];
  
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      results.push({
        start: match[1],
        end: match[2],
        raw: match[0]
      });
    }
  }
  
  return results;
}

function extractEducation(text: string): Education[] {
  const education: Education[] = [];
  const dates = extractDates(text);
  
  const lines = text.split(/\n+/);
  let currentEdu: Partial<Education> | null = null;
  let eduId = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const hasSchool = SCHOOL_PATTERNS.some(p => line.includes(p));
    const hasDegree = DEGREE_PATTERNS.some(p => line.includes(p));
    const lineDates = extractDates(line);

    if (hasSchool || (hasDegree && lineDates.length > 0)) {
      if (currentEdu) {
        education.push(currentEdu as Education);
      }

      currentEdu = {
        id: `edu-${eduId++}`,
        school: '',
        degree: '',
        major: '',
        startDate: '',
        endDate: ''
      };

      for (const school of SCHOOL_PATTERNS) {
        if (line.includes(school)) {
          const idx = line.indexOf(school);
          const startIdx = Math.max(0, line.lastIndexOf(' ', idx - 1) + 1);
          currentEdu.school = line.slice(startIdx, idx + school.length).trim();
          break;
        }
      }

      for (const degree of DEGREE_PATTERNS) {
        if (line.includes(degree)) {
          currentEdu.degree = degree;
          break;
        }
      }

      if (lineDates.length > 0) {
        currentEdu.startDate = lineDates[0].start;
        currentEdu.endDate = lineDates[0].end;
      }

      const majorKeywords = ['专业', '方向', 'Major', 'Program'];
      for (const keyword of majorKeywords) {
        if (line.includes(keyword)) {
          const idx = line.indexOf(keyword) + keyword.length;
          currentEdu.major = line.slice(idx).replace(/^[:：\s]+/, '').trim();
          break;
        }
      }

      if (!currentEdu.major && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine && !SCHOOL_PATTERNS.some(p => nextLine.includes(p))) {
          currentEdu.major = nextLine;
        }
      }
    }
  }

  if (currentEdu) {
    education.push(currentEdu as Education);
  }

  return education.filter(e => e.school || e.degree);
}

const SKILL_KEYWORDS: Record<string, string[]> = {
  'React': ['React', 'React.js', 'ReactJS', 'react'],
  'Vue': ['Vue', 'Vue.js', 'VueJS', 'vue'],
  'TypeScript': ['TypeScript', 'TS', 'Typescript', 'typescript'],
  'JavaScript': ['JavaScript', 'JS', 'Javascript', 'javascript', 'ECMAScript'],
  'HTML': ['HTML', 'HTML5', 'html'],
  'CSS': ['CSS', 'CSS3', 'css', 'Sass', 'Less', 'SCSS'],
  'Node.js': ['Node.js', 'NodeJS', 'Node', 'node.js'],
  'Python': ['Python', 'python', 'py'],
  'SQL': ['SQL', 'sql', 'MySQL', 'PostgreSQL', 'MongoDB'],
  'Java': ['Java', 'java'],
  'Git': ['Git', 'git', 'GitHub', 'GitLab'],
  'Docker': ['Docker', 'docker', 'Kubernetes', 'K8s'],
  'Redux': ['Redux', 'redux', 'MobX', 'Vuex'],
  'Webpack': ['Webpack', 'webpack'],
  'Vite': ['Vite', 'vite'],
  'RESTful API': ['RESTful', 'REST', 'API', 'restful'],
  '响应式设计': ['响应式', '响应式设计', 'Responsive', 'responsive'],
  '性能优化': ['性能优化', '性能', 'performance', '优化'],
  '单元测试': ['单元测试', 'Jest', 'Mocha', '测试', 'Test', 'test'],
  '机器学习': ['机器学习', 'Machine Learning', 'ML', '深度学习', 'Deep Learning'],
  '数据可视化': ['数据可视化', '可视化', 'ECharts', 'D3.js', '可视化'],
  'Tableau': ['Tableau', 'tableau'],
  'Excel': ['Excel', 'excel', 'VBA'],
  'Pandas': ['Pandas', 'pandas'],
  'NumPy': ['NumPy', 'numpy'],
  'Scikit-learn': ['Scikit-learn', 'sklearn', 'scikit'],
  'A/B测试': ['A/B测试', 'AB测试', 'A/B Test'],
  '数据挖掘': ['数据挖掘', 'Data Mining'],
  'Spark': ['Spark', 'spark'],
  'Hadoop': ['Hadoop', 'hadoop'],
  '需求分析': ['需求分析', '需求', 'Requirements'],
  '产品设计': ['产品设计', 'Product Design'],
  '用户体验': ['用户体验', 'UX', 'UE', 'User Experience'],
  '原型设计': ['原型设计', '原型', 'Prototype'],
  'Axure': ['Axure', 'axure'],
  'Figma': ['Figma', 'figma', 'Sketch'],
  '项目管理': ['项目管理', 'PM', 'Project Management'],
  '敏捷开发': ['敏捷开发', 'Agile', 'Scrum', '敏捷'],
  '数据分析': ['数据分析', 'Data Analysis'],
  '用户调研': ['用户调研', '用户研究', 'User Research'],
  '竞品分析': ['竞品分析', 'Competitor Analysis', '竞品'],
  'PRD': ['PRD', 'prd', '产品需求文档'],
  'OKR': ['OKR', 'okr', 'KPI'],
  '增长黑客': ['增长黑客', 'Growth Hacker', '增长'],
  '商业模式': ['商业模式', 'Business Model'],
  '统计学': ['统计学', 'Statistics', '统计'],
  'ETL': ['ETL', 'etl', '数据仓库']
};

function extractSkills(text: string): Skill[] {
  const skills: Skill[] = [];
  const skillCounts: Record<string, { count: number; contexts: string[] }> = {};

  for (const [standardName, aliases] of Object.entries(SKILL_KEYWORDS)) {
    for (const alias of aliases) {
      const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (!skillCounts[standardName]) {
          skillCounts[standardName] = { count: 0, contexts: [] };
        }
        skillCounts[standardName].count++;
        
        const startIdx = Math.max(0, match.index - 20);
        const endIdx = Math.min(text.length, match.index + match[0].length + 20);
        const context = text.slice(startIdx, endIdx).replace(/\s+/g, ' ').trim();
        if (!skillCounts[standardName].contexts.includes(context) && skillCounts[standardName].contexts.length < 3) {
          skillCounts[standardName].contexts.push(context);
        }
      }
    }
  }

  for (const [name, data] of Object.entries(skillCounts)) {
    if (data.count > 0) {
      skills.push({
        name,
        count: data.count,
        contexts: data.contexts
      });
    }
  }

  return skills.sort((a, b) => b.count - a.count);
}

function extractProjects(text: string, skills: Skill[]): Project[] {
  const projects: Project[] = [];
  const projectKeywords = ['项目', 'Project', 'PROJECT', '作品', '实践'];
  const lines = text.split(/\n+/);
  let currentProject: Partial<Project> | null = null;
  let projectId = 0;
  let descriptionLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (currentProject && descriptionLines.length > 0) {
        const project = currentProject;
        project.description = descriptionLines.join(' ');
        
        const projectSkills = skills.filter(skill => 
          project.description?.toLowerCase().includes(skill.name.toLowerCase())
        ).map(s => s.name);
        
        project.skills = projectSkills;
        projects.push(project as Project);
        currentProject = null;
        descriptionLines = [];
      }
      continue;
    }

    const isProjectHeader = projectKeywords.some(kw => 
      line.startsWith(kw) || line.match(new RegExp(`^[0-9]+[.、]\\s*${kw}`))
    );

    if (isProjectHeader) {
      if (currentProject && descriptionLines.length > 0) {
        const project = currentProject;
        project.description = descriptionLines.join(' ');
        const projectSkills = skills.filter(skill => 
          project.description?.toLowerCase().includes(skill.name.toLowerCase())
        ).map(s => s.name);
        project.skills = projectSkills;
        projects.push(project as Project);
      }

      const dates = extractDates(line);
      let name = line.replace(/^[0-9]+[.、]\s*/, '').trim();
      
      for (const date of dates) {
        name = name.replace(date.raw, '').trim();
      }
      
      for (const kw of projectKeywords) {
        name = name.replace(new RegExp(`^${kw}[：:名称]*\\s*`), '').trim();
      }

      currentProject = {
        id: `project-${projectId++}`,
        name: name || '未命名项目',
        description: '',
        startDate: dates[0]?.start || '',
        endDate: dates[0]?.end || '',
        skills: []
      };
      descriptionLines = [];
    } else if (currentProject) {
      descriptionLines.push(line);
    }
  }

  if (currentProject && descriptionLines.length > 0) {
    const project = currentProject;
    project.description = descriptionLines.join(' ');
    const projectSkills = skills.filter(skill => 
      project.description?.toLowerCase().includes(skill.name.toLowerCase())
    ).map(s => s.name);
    project.skills = projectSkills;
    projects.push(project as Project);
  }

  return projects.slice(0, 10);
}

export function parseResume(text: string): ParsedResume {
  const startTime = Date.now();
  
  const skills = extractSkills(text);
  const education = extractEducation(text);
  const projects = extractProjects(text, skills);

  const result: ParsedResume = {
    id: `resume-${Date.now()}`,
    rawText: text,
    education,
    skills,
    projects
  };

  const duration = Date.now() - startTime;
  console.log(`[Parser] Resume parsed in ${duration}ms`);

  return result;
}
