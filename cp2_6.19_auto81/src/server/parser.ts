import type { ParsedResume, Education, ProjectExperience } from '../types';

const DEGREE_PATTERNS = ['博士', '硕士', '本科', '学士', '大专', '高中', 'PhD', 'Master', 'Bachelor', 'MBA'];
const SCHOOL_KEYWORDS = ['大学', '学院', 'University', 'College', 'Institute', 'School'];

const EDUCATION_REGEX = /(\d{4})\s*[-~年至]\s*(\d{4}|至今|现在|Present|Now)\s*(.+?)(?:大学|学院|University|College|Institute|School)[^，。,\n]*[，。,\n]?\s*(.+?)[\n，。,]/g;
const DATE_REGEX = /(\d{4})\s*[-~年至]\s*(\d{4}|至今|现在|Present|Now)/g;

const SKILL_DICTIONARY = new Set([
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'SASS', 'Less',
  'Node.js', 'Express', 'Next.js', 'Nuxt', 'Webpack', 'Vite', 'Rollup', 'Gulp',
  'Git', 'SVN', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD',
  'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin', 'R', 'Scala',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server', 'SQLite',
  'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'Matplotlib',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', '数据分析', '机器学习', '深度学习',
  'Tableau', 'Power BI', 'Excel', 'SPSS', 'SAS', 'Stata',
  '产品设计', '需求分析', '用户研究', 'Axure', 'Figma', 'Sketch', '原型设计', '竞品分析',
  '项目管理', '敏捷开发', 'Scrum', 'PRD', '交互设计', '用户体验', 'UX', 'UI',
  'RESTful', 'GraphQL', 'WebSocket', '微服务', '分布式', '高并发',
  'Redux', 'Zustand', 'MobX', 'Pinia', 'Vuex',
  'Jest', 'Mocha', 'Chai', 'Vitest', 'Cypress', 'Selenium',
  'Linux', 'Unix', 'Nginx', 'Apache', 'AWS', '阿里云', '腾讯云',
  'ETL', 'A/B Testing', 'Hadoop', 'Spark', 'Flink', 'Kafka',
  'Hooks', 'React Native', 'Flutter', 'Weex', '小程序', 'Taro',
  '算法', '数据结构', '设计模式', '架构设计', '性能优化'
]);

const PROJECT_PATTERNS = [
  /项目(?:名称|经历)?[：:]\s*(.+?)(?:\n[\s\S]*?)(?=项目[名称经历]?[：:]|工作经历|教育背景|$)/g,
  /(?:^|\n)\s*(.{2,30})\s*\n\s*(?:[-–•]|项目描述|职责)[：:]?\s*([\s\S]{20,500}?)(?=\n\s*(?:.{2,30})\s*\n\s*(?:[-–•]|项目描述|职责)|教育|工作|$)/g
];

export function parseResume(text: string): ParsedResume {
  const startTime = Date.now();
  const cleanedText = text.replace(/\r\n/g, '\n').replace(/\s{2,}/g, ' ').trim();

  const id = `resume_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const education = extractEducation(cleanedText);
  const { skills, occurrences, contexts } = extractSkills(cleanedText);
  const projects = extractProjects(cleanedText);

  const elapsed = Date.now() - startTime;
  if (elapsed > 450) {
    console.warn(`[Parser] Warning: parsing took ${elapsed}ms (target < 500ms)`);
  }

  return {
    id,
    education,
    skills,
    projects,
    rawText: cleanedText,
    skillOccurrences: occurrences,
    skillContexts: contexts,
  };
}

function extractEducation(text: string): Education[] {
  const educationList: Education[] = [];
  const lines = text.split('\n');
  let currentBlock: string[] = [];
  let inEducationSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/教育(?:背景|经历)?|学历|Academic|Education/.test(line)) {
      inEducationSection = true;
      continue;
    }
    if (inEducationSection && /工作(?:经历|经验)?|项目(?:经历|经验)?|技能|实习|Professional|Experience|Projects?|Skills/.test(line)) {
      break;
    }
    if (inEducationSection && line) {
      currentBlock.push(line);
    }
  }

  const blockText = currentBlock.join('\n');

  for (const line of currentBlock) {
    const dateMatch = line.match(/(\d{4})\s*[-~年至/.]\s*(\d{4}|至今|现在|Present|Now)/);
    if (dateMatch || SCHOOL_KEYWORDS.some(k => line.includes(k))) {
      let startDate = '';
      let endDate = '';
      if (dateMatch) {
        startDate = dateMatch[1];
        endDate = dateMatch[2];
      }

      const schoolMatch = line.match(/([^\s，。,]+(?:大学|学院|University|College|Institute|School)[^\s，。,]*)/);
      const school = schoolMatch ? schoolMatch[1] : line.split(/\s/)[0] || '未知学校';

      let degree = '';
      for (const d of DEGREE_PATTERNS) {
        if (line.includes(d) || blockText.includes(d)) {
          degree = d;
          break;
        }
      }

      const majorKeywords = ['专业', 'Major', '方向', '主修'];
      let major = '未明确';
      for (const kw of majorKeywords) {
        const majorMatch = blockText.match(new RegExp(`${kw}[：:]?\\s*([^，。,\\n]+)`));
        if (majorMatch) {
          major = majorMatch[1].trim();
          break;
        }
      }

      educationList.push({
        school,
        degree: degree || '未明确',
        major,
        startDate: startDate || '未知',
        endDate: endDate || '未知',
      });
      break;
    }
  }

  if (educationList.length === 0) {
    for (const line of lines) {
      if (SCHOOL_KEYWORDS.some(k => line.includes(k))) {
        const schoolMatch = line.match(/([^\s，。,]+(?:大学|学院|University|College|Institute|School)[^\s，。,]*)/);
        const dateMatch = line.match(/(\d{4})\s*[-~年至/.]\s*(\d{4}|至今|现在)/);
        educationList.push({
          school: schoolMatch ? schoolMatch[1] : line.trim().split(/\s/)[0] || '未知学校',
          degree: DEGREE_PATTERNS.find(d => line.includes(d)) || '未明确',
          major: '未明确',
          startDate: dateMatch?.[1] || '未知',
          endDate: dateMatch?.[2] || '未知',
        });
      }
    }
  }

  return educationList.slice(0, 5);
}

function extractSkills(text: string): {
  skills: string[];
  occurrences: Record<string, number>;
  contexts: Record<string, string[]>;
} {
  const occurrences: Record<string, number> = {};
  const contexts: Record<string, string[]> = {};
  const lowerText = text.toLowerCase();

  for (const skill of SKILL_DICTIONARY) {
    const lowerSkill = skill.toLowerCase();
    const regex = new RegExp(`(?<![a-zA-Z0-9_])${escapeRegExp(lowerSkill)}(?![a-zA-Z0-9_])`, 'gi');
    let match;
    let count = 0;
    const skillContexts: string[] = [];

    while ((match = regex.exec(lowerText)) !== null) {
      count++;
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + skill.length + 20);
      let context = text.slice(start, end);
      context = (start > 0 ? '...' : '') + context.trim() + (end < text.length ? '...' : '');
      skillContexts.push(context);
      if (skillContexts.length >= 5) break;
    }

    if (count > 0) {
      occurrences[skill] = count;
      contexts[skill] = skillContexts;
    }
  }

  const sortedSkills = Object.entries(occurrences)
    .sort((a, b) => b[1] - a[1])
    .map(([skill]) => skill);

  return { skills: sortedSkills, occurrences, contexts };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractProjects(text: string): ProjectExperience[] {
  const projects: ProjectExperience[] = [];
  const lines = text.split('\n');
  const projectNames = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const projectNameMatch = line.match(/项目(?:名称)?[：:]\s*(.+?)(?:\s*项目)?$/);
    if (projectNameMatch) {
      const name = projectNameMatch[1].trim().slice(0, 50);
      if (!projectNames.has(name)) {
        projectNames.add(name);
        let description = '';
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (/项目(?:名称)?[：:]|工作(?:经历)?[：:]|教育(?:背景)?[：:]|技能[：:]/.test(nextLine)) break;
          description += nextLine + ' ';
          if (description.length > 200) break;
        }
        projects.push({
          name,
          description: description.trim().slice(0, 200),
          skills: [],
          context: text.slice(Math.max(0, i * 50), Math.min(text.length, i * 50 + 300)),
        });
      }
    }
  }

  if (projects.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (/^[-–•]\s*(.+)/.test(line) && line.length > 20) {
        const nextFew = lines.slice(i, i + 3).join(' ').slice(0, 250);
        const name = line.slice(0, 40) + (line.length > 40 ? '...' : '');
        if (!projectNames.has(name)) {
          projectNames.add(name);
          projects.push({
            name: `项目${projects.length + 1}`,
            description: nextFew.trim(),
            skills: [],
            context: nextFew.trim(),
          });
        }
      }
    }
  }

  return projects.slice(0, 8);
}
