export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  school: string;
  degree: string;
  major: string;
  graduationDate: string;
}

export interface ParsedResume {
  name: string;
  skills: string[];
  workExperience: WorkExperience[];
  education: Education[];
}

export function parseResume(text: string): ParsedResume {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  
  const name = extractName(cleanText);
  const skills = extractSkills(cleanText);
  const workExperience = extractWorkExperience(cleanText);
  const education = extractEducation(cleanText);

  return {
    name,
    skills,
    workExperience,
    education,
  };
}

function extractName(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const namePatterns = [
    /^(?:姓\s*名|Name)\s*[:：]\s*(.+)$/im,
    /^([\u4e00-\u9fa5]{2,4})\s*$/m,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length <= 20 && !firstLine.includes('@') && !firstLine.match(/\d/) && !firstLine.includes('工程师')) {
      return firstLine;
    }
  }

  for (const line of lines.slice(0, 5)) {
    if (/^[\u4e00-\u9fa5]{2,4}$/.test(line)) {
      return line;
    }
  }

  return '未知候选人';
}

function extractSkills(text: string): string[] {
  const skills: string[] = [];
  
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Vue', 'Angular', 'Node.js', 'Express',
    'Python', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Java',
    'HTML', 'CSS', 'SCSS', 'Less', 'Tailwind', 'Bootstrap',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server',
    'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Linux', 'Nginx',
    'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy',
    'Machine Learning', 'Deep Learning', '数据挖掘', '数据分析',
    'Spring Boot', 'Spring MVC', 'Spring', 'MyBatis', 'Hibernate',
    'RESTful', 'GraphQL', 'WebSocket', '微服务', '分布式',
    'Next.js', 'Nuxt.js', 'Svelte', 'jQuery',
    'Webpack', 'Vite', 'Rollup', 'Babel', 'ESLint',
    'Jenkins', 'CI/CD', 'DevOps', 'Agile', 'Scrum',
    'Figma', 'Sketch', 'Photoshop', 'UI/UX',
    '算法', '数据结构', '设计模式', '系统架构',
    'SQL', 'NoSQL',
  ];

  const sortedKeywords = [...skillKeywords].sort((a, b) => b.length - a.length);
  
  const foundSkills = new Set<string>();
  
  for (const skill of sortedKeywords) {
    const skillLower = skill.toLowerCase();
    
    if (skillLower.length <= 3) {
      continue;
    }
    
    const pattern = new RegExp(
      `(?:^|[\\s,，、;；/\\(\\)（）【】])${escapeRegex(skillLower)}(?:$|[\\s,，、;；/\\(\\)（）【】.。])`,
      'i'
    );
    
    if (pattern.test(text.toLowerCase())) {
      foundSkills.add(skill);
    }
  }
  
  const skillSection = findSectionByKeywords(text, [
    '技能', '专业技能', '核心技能', '技术栈', 'Skills', '技术能力'
  ]);
  
  if (skillSection) {
    const sectionSkills = extractSkillsFromSection(skillSection);
    for (const s of sectionSkills) {
      if (s.length > 1 && s.length < 30) {
        const normalized = normalizeSkillName(s);
        if (normalized) {
          foundSkills.add(normalized);
        }
      }
    }
  }

  return Array.from(foundSkills).slice(0, 30);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSkillName(skill: string): string | null {
  const trimmed = skill.trim().replace(/^[•\-·\d.、\s]+/, '').trim();
  
  if (!trimmed || trimmed.length < 2) return null;
  
  return trimmed;
}

function extractSkillsFromSection(sectionText: string): string[] {
  const skills: string[] = [];
  
  const separators = [/[,，、；;]/, /\n+/, /\s{2,}/, /\|/];
  
  for (const sep of separators) {
    const parts = sectionText.split(sep).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40);
    if (parts.length > skills.length) {
      skills.length = 0;
      skills.push(...parts);
    }
  }
  
  return [...new Set(skills)];
}

function findSectionByKeywords(text: string, keywords: string[]): string | null {
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    for (const keyword of keywords) {
      if (line.includes(keyword)) {
        const sectionStart = i + 1;
        let sectionEnd = lines.length;
        
        const sectionBreakKeywords = [
          '工作经历', '工作经验', '职业经历', '教育背景', '教育经历',
          '项目经验', '项目经历', '自我评价', '个人简介', '联系方式',
          'Work Experience', 'Education', 'Projects', 'About', 'Contact'
        ];
        
        for (let j = sectionStart; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          for (const breakKw of sectionBreakKeywords) {
            if (nextLine.includes(breakKw) && nextLine.length < 30) {
              sectionEnd = j;
              break;
            }
          }
          if (sectionEnd < lines.length) break;
        }
        
        return lines.slice(sectionStart, sectionEnd).join('\n').trim();
      }
    }
  }
  
  return null;
}

function extractWorkExperience(text: string): WorkExperience[] {
  const experiences: WorkExperience[] = [];
  
  const workSection = findSectionByKeywords(text, [
    '工作经历', '工作经验', '职业经历', '工作履历', 'Work Experience', 'Employment', 'Experience'
  ]);
  
  if (!workSection) {
    return experiences;
  }

  const entries = splitWorkEntries(workSection);
  
  for (const entryText of entries.slice(0, 5)) {
    const exp = parseWorkEntry(entryText);
    if (exp.company || exp.position) {
      experiences.push(exp);
    }
  }

  return experiences;
}

function splitWorkEntries(sectionText: string): string[] {
  const entries: string[] = [];
  const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length === 0) return entries;
  
  const datePattern = /(\d{4}[-/年]\d{0,2}[-/月]?\s*[-—~至]\s*(?:\d{4}[-/年]\d{0,2}[-/月]?|至今|现在|Present|Now))/i;
  
  let currentEntry: string[] = [];
  
  for (const line of lines) {
    if (datePattern.test(line) && currentEntry.length > 0) {
      entries.push(currentEntry.join('\n'));
      currentEntry = [line];
    } else {
      currentEntry.push(line);
    }
  }
  
  if (currentEntry.length > 0) {
    entries.push(currentEntry.join('\n'));
  }
  
  if (entries.length === 0 && lines.length > 0) {
    entries.push(lines.join('\n'));
  }
  
  return entries;
}

function parseWorkEntry(entryText: string): WorkExperience {
  const lines = entryText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const dates = extractDates(entryText);
  const company = extractCompany(entryText);
  const position = extractPosition(entryText);
  
  let description = '';
  const descLines = lines.filter(l => {
    const hasDate = /\d{4}[-/年]/.test(l);
    const isCompany = l.includes(company) && company !== '未知公司';
    const isPosition = l.includes(position) && position !== '未知职位';
    return !hasDate && !isCompany && !isPosition;
  });
  
  description = descLines.join(' ').substring(0, 200);
  
  return {
    company,
    position,
    startDate: dates[0] || '',
    endDate: dates[1] || '至今',
    description,
  };
}

function extractDates(text: string): string[] {
  const datePattern = /(\d{4}[-/年]\d{0,2}[-/月]?)/g;
  const matches = text.match(datePattern);
  return matches || [];
}

function extractCompany(text: string): string {
  const companyPatterns = [
    /(.+?科技有限公司|.+?科技公司|.+?有限公司|.+?集团|.+?公司|.+?Co\.?\s*Ltd\.?|.+?Inc\.?)/i,
    /(?:在|就职于|任职于)\s*(.+?)\s*(?:担任|任职|工作)/i,
  ];
  
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (const line of lines) {
    if (line.includes('公司') || line.includes('科技') || line.includes('集团')) {
      if (!line.includes('工程师') && !line.includes('经理') && !line.includes('主管')) {
        return line;
      }
    }
  }
  
  if (lines.length > 0) {
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i];
      if (line.length < 20 && !line.includes('工程师') && !line.match(/\d{4}/)) {
        return line;
      }
    }
  }
  
  return '未知公司';
}

function extractPosition(text: string): string {
  const positionPatterns = [
    /(?:担任|任职|职位|Position|岗位)\s*[:：]?\s*(.+?)(?:\s{2,}|$|,|，)/i,
    /(.+?工程师|.+?设计师|.+?分析师|.+?经理|.+?主管|.+?架构师|.+?开发|.+?总监)/i,
  ];
  
  for (const pattern of positionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const pos = match[1].trim();
      if (pos.length < 40 && pos.length > 1) return pos;
    }
  }
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (const line of lines) {
    if (line.includes('工程师') || line.includes('设计师') || line.includes('经理') || 
        line.includes('主管') || line.includes('架构师') || line.includes('分析师')) {
      return line;
    }
  }
  
  return '未知职位';
}

function extractEducation(text: string): Education[] {
  const education: Education[] = [];
  
  const eduSection = findSectionByKeywords(text, [
    '教育背景', '教育经历', '学历', '教育', 'Education', 'Academic', '毕业院校'
  ]);
  
  if (!eduSection) {
    return education;
  }

  const entries = splitEducationEntries(eduSection);
  
  for (const entryText of entries.slice(0, 3)) {
    const edu = parseEducationEntry(entryText);
    if (edu.school) {
      education.push(edu);
    }
  }

  return education;
}

function splitEducationEntries(sectionText: string): string[] {
  const entries: string[] = [];
  const lines = sectionText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length === 0) return entries;
  
  const schoolKeywords = ['大学', '学院', 'University', 'College', 'School', '研究院'];
  
  let currentEntry: string[] = [];
  
  for (const line of lines) {
    const isSchoolLine = schoolKeywords.some(kw => line.includes(kw));
    if (isSchoolLine && currentEntry.length > 0) {
      entries.push(currentEntry.join('\n'));
      currentEntry = [line];
    } else {
      currentEntry.push(line);
    }
  }
  
  if (currentEntry.length > 0) {
    entries.push(currentEntry.join('\n'));
  }
  
  if (entries.length === 0 && lines.length > 0) {
    entries.push(lines.join('\n'));
  }
  
  return entries;
}

function parseEducationEntry(entryText: string): Education {
  const school = extractSchool(entryText);
  const degree = extractDegree(entryText);
  const major = extractMajor(entryText);
  const graduationDate = extractGraduationDate(entryText);
  
  return {
    school,
    degree,
    major,
    graduationDate,
  };
}

function extractSchool(text: string): string {
  const schoolPatterns = [
    /(.+?大学)/,
    /(.+?学院)/,
    /(.+?University)/i,
    /(.+?College)/i,
    /(.+?School)/i,
  ];
  
  for (const pattern of schoolPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '';
}

function extractDegree(text: string): string {
  const degrees = ['博士', '硕士', '本科', '大专', '高中', '中专', 'PhD', 'Doctor', 'Master', 'Bachelor', 'MBA'];
  
  for (const degree of degrees) {
    if (text.includes(degree)) {
      return degree;
    }
  }
  
  return '';
}

function extractMajor(text: string): string {
  const majorKeywords = [
    '计算机科学', '软件工程', '信息技术', '信息工程', '电子工程', '通信工程',
    '电气工程', '机械工程', '土木工程', '化学工程',
    '数学', '统计学', '物理学', '化学', '生物学', '生物医学',
    '工商管理', '市场营销', '金融学', '会计学', '经济学', '国际经济',
    '设计学', '美术', '视觉传达', '环境设计', '产品设计',
    '英语', '日语', '汉语言文学', '新闻学', '法学',
    'Computer Science', 'Software Engineering', 'Information Technology',
    'Electrical Engineering', 'Mechanical Engineering',
    'Business Administration', 'Marketing', 'Finance', 'Accounting',
  ];
  
  for (const major of majorKeywords) {
    if (text.includes(major)) {
      return major;
    }
  }
  
  const majorPatterns = [
    /(?:专业|主修)\s*[:：]?\s*(.+?)(?:\s{2,}|$|,|，)/i,
  ];
  
  for (const pattern of majorPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '';
}

function extractGraduationDate(text: string): string {
  const datePattern = /(\d{4}[-/年]\d{0,2}[-/月]?)/g;
  const matches = text.match(datePattern);
  
  if (matches && matches.length > 0) {
    return matches[matches.length - 1];
  }
  
  const yearMatch = text.match(/(\d{4})\s*年?\s*(?:毕业|Graduation)/i);
  if (yearMatch) {
    return yearMatch[1] + '年';
  }
  
  return '';
}
