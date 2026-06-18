import type { ParsedResume, WorkExperience, Education } from '../types';

const NAME_PATTERNS = [
  /(?:姓\s*名|Name)\s*[:：]\s*([\u4e00-\u9fa5A-Za-z\s]{2,30})/i,
  /^([\u4e00-\u9fa5]{2,4})\s*$/m,
  /^([A-Z][a-z]+\s+[A-Z][a-z]+)\s*$/m,
];

const SKILL_KEYWORDS = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
  'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
  'HTML', 'CSS', 'Sass', 'Less', 'Tailwind', 'Webpack', 'Vite', 'Rollup',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL', 'NoSQL',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Linux', 'Git',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Machine Learning',
  'Deep Learning', '数据分析', '数据挖掘', '机器学习', '深度学习',
  'REST API', 'GraphQL', '微服务', '分布式系统', '高并发',
  'Jest', 'Mocha', 'Cypress', 'Selenium', '单元测试', '自动化测试',
  'Figma', 'Sketch', 'UI/UX', '产品设计', '敏捷开发', 'Scrum',
];

const EDUCATION_PATTERNS = [
  /(\d{4})\s*[-年至到]\s*(\d{4}|至今|现在)\s*[,，]?\s*(.+?)[,，]\s*(.+?)[,，]\s*(学士|硕士|博士|本科|研究生|大专|高中)/,
  /(学士|硕士|博士|本科|研究生|大专)\s*[,，]?\s*(.+?)[,，]\s*(.+?)\s*[,，]?\s*(\d{4})\s*[-年至到]\s*(\d{4}|至今|现在)/,
];

const EXPERIENCE_PATTERNS = [
  /(\d{4})\s*[-年至到]\s*(\d{4}|至今|现在)\s*[,，]?\s*(.+?)[,，]\s*(.+?)(?:\n|$)/,
];

function extractName(text: string): string {
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  const firstLine = text.split('\n')[0]?.trim();
  if (firstLine && firstLine.length <= 20) {
    return firstLine;
  }
  return '未知候选人';
}

function extractSkills(text: string): string[] {
  const skills: Set<string> = new Set();
  const lowerText = text.toLowerCase();

  for (const skill of SKILL_KEYWORDS) {
    if (lowerText.includes(skill.toLowerCase())) {
      skills.add(skill);
    }
  }

  const skillSectionMatch = text.match(/(?:技\s*能|Skills|专业技能)\s*[:：]?\s*([\s\S]*?)(?=\n\s*(?:工作|教育|项目|经历|$))/i);
  if (skillSectionMatch) {
    const skillText = skillSectionMatch[1];
    const separated = skillText.split(/[,，、；;\/\s]+/).filter(s => s.trim().length > 1);
    for (const s of separated) {
      const trimmed = s.trim();
      if (trimmed.length <= 30 && trimmed.length >= 2) {
        skills.add(trimmed);
      }
    }
  }

  return Array.from(skills);
}

function extractEducation(text: string): Education[] {
  const educationList: Education[] = [];
  const eduSection = text.match(/(?:教育\s*(?:经历|背景)|Education)\s*[:：]?\s*([\s\S]*?)(?=\n\s*(?:工作|技能|项目|$))/i);
  const searchText = eduSection ? eduSection[1] : text;

  for (const pattern of EDUCATION_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags === 'g' ? pattern.flags : pattern.flags + 'g');
    while ((match = regex.exec(searchText)) !== null) {
      if (match.length >= 5) {
        educationList.push({
          school: match[3]?.trim() || '',
          degree: match[5]?.trim() || '',
          major: match[4]?.trim() || '',
          startDate: match[1]?.trim() || '',
          endDate: match[2]?.trim() || '',
        });
      }
    }
  }

  if (educationList.length === 0) {
    const lines = searchText.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const simpleMatch = line.match(/(清华|北大|北京|上海|浙江|复旦|交通|科技|大学|学院|University|College|School)/i);
      if (simpleMatch) {
        educationList.push({
          school: line.trim(),
          degree: '',
          major: '',
          startDate: '',
          endDate: '',
        });
      }
    }
  }

  return educationList.slice(0, 5);
}

function extractWorkExperience(text: string): WorkExperience[] {
  const expList: WorkExperience[] = [];
  const expSection = text.match(/(?:工作\s*(?:经历|经验)|(?:Professional\s+)?Work\s+Experience)\s*[:：]?\s*([\s\S]*?)(?=\n\s*(?:教育|技能|项目|$))/i);
  const searchText = expSection ? expSection[1] : text;

  const lines = searchText.split('\n').filter(l => l.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(/(\d{4})\s*[-年至到]\s*(\d{4}|至今|现在)/);
    if (dateMatch) {
      const rest = line.replace(dateMatch[0], '').trim();
      const parts = rest.split(/[,，\s]+/).filter(p => p);
      expList.push({
        company: parts[0] || '',
        position: parts.slice(1).join(' ') || '',
        startDate: dateMatch[1],
        endDate: dateMatch[2],
        description: lines[i + 1]?.trim() || '',
      });
    }
  }

  return expList.slice(0, 10);
}

export function parseResume(text: string): ParsedResume {
  return {
    name: extractName(text),
    skills: extractSkills(text),
    workExperience: extractWorkExperience(text),
    education: extractEducation(text),
    rawText: text,
  };
}
