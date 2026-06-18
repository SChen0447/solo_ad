import type { ParsedResume, WorkExperience, Education } from '../shared/types';

function extractName(text: string): string {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  const namePatterns = [
    /^(?:姓\s*名|Name)\s*[:：]\s*(.+)$/i,
    /^([\u4e00-\u9fa5]{2,4})\s*$/,
    /^([A-Z][a-z]+\s[A-Z][a-z]+)\s*$/,
  ];

  for (const pattern of namePatterns) {
    for (const line of lines.slice(0, 10)) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }

  for (const line of lines.slice(0, 5)) {
    if (line.length >= 2 && line.length <= 20 && /^[\u4e00-\u9fa5A-Za-z\s]+$/.test(line)) {
      return line.trim();
    }
  }

  return '未知候选人';
}

const SKILL_KEYWORDS = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'NodeJS',
  'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 'Rust', 'PHP', 'Ruby',
  'HTML', 'HTML5', 'CSS', 'CSS3', 'SASS', 'LESS', 'Tailwind',
  'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Oracle', 'SQLite',
  'Docker', 'Kubernetes', 'K8s', 'AWS', 'Azure', 'GCP', 'Linux', 'Git',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn', 'Machine Learning',
  'Deep Learning', 'NLP', 'Data Analysis', '数据结构', '算法',
  'Spring Boot', 'Django', 'Flask', 'Express', 'Next.js', 'Nuxt.js',
  'RESTful', 'GraphQL', 'WebSocket', '微服务', '分布式',
  'Redux', 'MobX', 'Webpack', 'Vite', 'Babel', 'ESLint',
  'Jest', 'Mocha', 'Cypress', 'Selenium', '单元测试',
  'Figma', 'Photoshop', 'UI/UX', 'Agile', 'Scrum',
  'Hadoop', 'Spark', 'Kafka', 'Elasticsearch',
  '前端', '后端', '全栈', '架构', 'DevOps',
];

function extractSkills(text: string): string[] {
  const skills: Set<string> = new Set();
  const lowerText = text.toLowerCase();

  for (const keyword of SKILL_KEYWORDS) {
    const escaped = keyword.replace(/[.+*?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s|[^a-zA-Z0-9\u4e00-\u9fa5])${escaped}(?:$|\\s|[^a-zA-Z0-9\u4e00-\u9fa5])`, 'i');
    if (regex.test(text)) {
      skills.add(keyword);
    }
  }

  const skillSectionMatch = text.match(/(?:技\s*能|Skill[s]?|专业技能|技术栈)[:：]?[\s\S]*?(?=\n\s*\n|$)/i);
  if (skillSectionMatch) {
    const sectionText = skillSectionMatch[0];
    const items = sectionText.split(/[,，、;；\n/·|]/).map(s => s.trim()).filter(Boolean);
    for (const item of items) {
      if (item.length <= 30 && item.length >= 2) {
        skills.add(item);
      }
    }
  }

  return Array.from(skills).slice(0, 30);
}

function extractWorkExperience(text: string): WorkExperience[] {
  const result: WorkExperience[] = [];
  
  const sectionMatch = text.match(/(?:工作经历|工作经验|职业经历|Work\s*Experience|Experience)[:：]?[\s\S]*?(?=\n\s*(?:教育背景|教育经历|学历|项目经历|技能|自我评价|$))/i);
  if (!sectionMatch) return result;

  const section = sectionMatch[0];
  const datePattern = /(\d{4})\s*[-年./]\s*(\d{1,2}|至今|now|present)/gi;
  
  const blocks = section.split(/\n\s*\n/).filter(b => b.trim().length > 10);
  
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const dates: { start: string; end: string }[] = [];
    let match;
    while ((match = datePattern.exec(block)) !== null) {
      dates.push({
        start: `${match[1]}-${match[2].padStart(2, '0')}`,
        end: match[2].match(/至今|now|present/i) ? '至今' : `${match[1]}-${match[2].padStart(2, '0')}`
      });
    }

    if (dates.length === 0) continue;

    const dateRange = dates[0];
    const nonDateLines = lines.filter(l => !/\d{4}/.test(l) || l.length > 20);
    
    let company = '';
    let position = '';
    
    if (nonDateLines.length >= 1) {
      const firstLine = nonDateLines[0].replace(/[·•●\-]\s*/, '');
      const parts = firstLine.split(/\s*[-—|/／]\s*|\s{2,}/);
      if (parts.length >= 2) {
        company = parts[0].trim();
        position = parts.slice(1).join(' ').trim();
      } else {
        company = firstLine.trim();
      }
    }
    
    if (nonDateLines.length >= 2 && !position) {
      position = nonDateLines[1].replace(/[·•●\-]\s*/, '').trim();
    }

    const description = nonDateLines.slice(position ? 2 : 1).join('; ').slice(0, 200);

    result.push({
      company: company || '未知公司',
      position: position || '未知职位',
      startDate: dateRange.start,
      endDate: dateRange.end,
      description: description || '暂无详细描述'
    });
  }

  return result.slice(0, 5);
}

function extractEducation(text: string): Education[] {
  const result: Education[] = [];

  const sectionMatch = text.match(/(?:教育背景|教育经历|学历|Education)[:：]?[\s\S]*?(?=\n\s*(?:工作经历|工作经验|项目经历|技能|自我评价|$))/i);
  if (!sectionMatch) return result;

  const section = sectionMatch[0];
  const datePattern = /(\d{4})\s*[-年./]\s*(\d{1,2}|至今|now|present)/gi;
  
  const degreeKeywords = ['博士', '硕士', '本科', '学士', '大专', '高中', 'PhD', 'Master', 'Bachelor', 'MBA'];
  const blocks = section.split(/\n\s*\n/).filter(b => b.trim().length > 10);

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 1) continue;

    const dates: { start: string; end: string }[] = [];
    let match;
    while ((match = datePattern.exec(block)) !== null) {
      dates.push({
        start: `${match[1]}-${match[2].padStart(2, '0')}`,
        end: match[2].match(/至今|now|present/i) ? '至今' : `${match[1]}-${match[2].padStart(2, '0')}`
      });
    }

    let degree = '';
    for (const kw of degreeKeywords) {
      if (block.toLowerCase().includes(kw.toLowerCase())) {
        degree = kw;
        break;
      }
    }

    const dateRange = dates.length > 0 ? dates[0] : { start: '未知', end: '未知' };
    const nonDateLines = lines.filter(l => !/\d{4}/.test(l) || l.length > 20);
    
    let school = '';
    let major = '';

    if (nonDateLines.length >= 1) {
      const firstLine = nonDateLines[0].replace(/[·•●\-]\s*/, '');
      const parts = firstLine.split(/\s*[-—|/／]\s*|\s{2,}/);
      school = parts[0].trim();
      if (parts.length >= 2) {
        major = parts.slice(1).join(' ').trim();
      }
    }

    if (!major && nonDateLines.length >= 2) {
      major = nonDateLines[1].replace(/[·•●\-]\s*/, '').trim();
    }

    if (school) {
      result.push({
        school,
        degree: degree || '未知学历',
        major: major || '未知专业',
        startDate: dateRange.start,
        endDate: dateRange.end
      });
    }
  }

  return result.slice(0, 3);
}

export function parseResume(text: string): ParsedResume {
  return {
    name: extractName(text),
    skills: extractSkills(text),
    workExperience: extractWorkExperience(text),
    education: extractEducation(text),
    rawText: text
  };
}
