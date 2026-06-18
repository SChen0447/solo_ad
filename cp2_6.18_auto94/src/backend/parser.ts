import type { ParsedResume, WorkExperience, Education } from './types';

const SKILL_KEYWORDS = [
  'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js', 'nodejs', 'node',
  'python', 'java', 'c++', 'c#', 'go', 'golang', 'rust', 'scala', 'kotlin', 'swift',
  'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap',
  'mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch', 'sqlite', 'oracle',
  'docker', 'kubernetes', 'k8s', 'jenkins', 'git', 'gitlab', 'github',
  'aws', 'azure', 'gcp', '阿里云', '腾讯云',
  'rest', 'graphql', 'grpc', 'websocket',
  'express', 'koa', 'nestjs', 'django', 'flask', 'spring', 'springboot', 'spring boot',
  'redux', 'mobx', 'vuex', 'pinia',
  'webpack', 'vite', 'rollup', 'gulp', 'babel',
  'jest', 'mocha', 'cypress', 'pytest', 'junit',
  'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn', 'sklearn',
  'hadoop', 'spark', 'kafka', 'hive', 'hbase',
  '机器学习', '深度学习', '人工智能', '数据挖掘', '自然语言处理', 'nlp',
  '计算机视觉', 'cv', '神经网络', '大数据', '数据分析',
  'linux', 'unix', 'shell', 'bash',
  'nginx', 'apache', 'tomcat',
  'typescript', 'es6', 'es7', 'esnext',
  'ui', 'ux', 'figma', 'sketch', 'photoshop',
  'agile', 'scrum', 'kanban', 'tdd', 'bdd',
  '微服务', '分布式', '高并发', '性能优化', '架构设计'
];

function extractName(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return '未知候选人';

  const namePatterns = [
    /^(?:姓\s*名|Name)\s*[:：]\s*([\u4e00-\u9fa5a-zA-Z\s]{2,20})/i,
    /^([\u4e00-\u9fa5]{2,4})\s*$/m,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})$/m,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  const firstMeaningfulLine = lines.find(l =>
    l.length >= 2 && l.length <= 15 && !/^\d/.test(l) &&
    !/@|邮箱|email|电话|phone|地址|address/i.test(l)
  );
  return firstMeaningfulLine || '未知候选人';
}

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundSkills: Set<string> = new Set();

  for (const skill of SKILL_KEYWORDS) {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?:^|[\\s,，、;；()（）\\[\\]【】\\-—_/\\\\])${escapedSkill}(?:$|[\\s,，、;；()（）\\[\\]【】\\-—_/\\\\])`, 'i');
    if (pattern.test(lowerText)) {
      foundSkills.add(skill);
    }
  }

  const skillSectionPattern = /(?:技\s*能|专业技能|Skills?|技术栈|核心技能)\s*[:：]?[\s\S]*?(?=\n\s*\n|\n\s*(?:工作|教育|项目|经历|Experience|Education|Project)|$)/i;
  const skillSectionMatch = text.match(skillSectionPattern);
  if (skillSectionMatch) {
    const sectionText = skillSectionMatch[0];
    const skillItems = sectionText.split(/[,，、;；\n\r\t|/\\]+/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 30);
    for (const item of skillItems) {
      const lowerItem = item.toLowerCase();
      const matched = SKILL_KEYWORDS.find(k => lowerItem.includes(k));
      if (matched) {
        foundSkills.add(matched);
      }
    }
  }

  return Array.from(foundSkills);
}

function extractWorkExperience(text: string): WorkExperience[] {
  const experiences: WorkExperience[] = [];

  const sectionPattern = /(?:工作\s*经历|工作经验|职业经历|Work\s*Experience|Employment)\s*[:：]?[\s\S]*?(?=\n\s*\n|\n\s*(?:教育|项目|技能|Education|Project|Skill)|$)/i;
  const sectionMatch = text.match(sectionPattern);
  if (!sectionMatch) return experiences;

  const sectionText = sectionMatch[0];
  const expBlocks = sectionText.split(/\n(?=\s*\d{4}|\s*[A-Z][a-z]+\s+\d{4})/).slice(1);

  for (const block of expBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) continue;

    const datePattern = /(\d{4}[年.\-\/]\s*\d{0,2}[月.\-\/]?|\d{4})\s*[-~～至到]\s*(\d{4}[年.\-\/]\s*\d{0,2}[月.\-\/]?|至今|现在|Present|Now)/i;
    const dateMatch = block.match(datePattern);

    let company = '';
    let position = '';

    const firstLine = lines[0];
    const parts = firstLine.split(/\s*[|｜,，\-—]\s*/);
    if (parts.length >= 2) {
      position = parts[0];
      company = parts[1];
    } else {
      position = firstLine;
    }

    if (lines.length > 1 && !dateMatch) {
      const secondLine = lines[1];
      if (secondLine.length < 30) {
        company = secondLine;
      }
    }

    const description = lines.slice(2).join(' ').substring(0, 200);

    if (position || company) {
      experiences.push({
        company: company || '未知公司',
        position: position || '未知职位',
        startDate: dateMatch ? dateMatch[1] : '',
        endDate: dateMatch ? dateMatch[2] : '',
        description,
      });
    }
  }

  if (experiences.length === 0) {
    const simpleExp = text.match(/(?:在|于)\s*([\u4e00-\u9fa5A-Za-z0-9\s]{2,20})\s*(?:公司|科技|集团|有限公司)?\s*(?:担任|任职|从事)\s*([\u4e00-\u9fa5A-Za-z0-9\s]{2,20})/);
    if (simpleExp) {
      experiences.push({
        company: simpleExp[1].trim(),
        position: simpleExp[2].trim(),
        startDate: '',
        endDate: '',
        description: '',
      });
    }
  }

  return experiences;
}

function extractEducation(text: string): Education[] {
  const educationList: Education[] = [];

  const sectionPattern = /(?:教育\s*经历|教育背景|Education|学历)\s*[:：]?[\s\S]*?(?=\n\s*\n|\n\s*(?:工作|项目|技能|Work|Project|Skill|Experience)|$)/i;
  const sectionMatch = text.match(sectionPattern);
  if (!sectionMatch) return educationList;

  const sectionText = sectionMatch[0];
  const degreeKeywords = ['博士', '硕士', '本科', '学士', '大专', '高中', 'PhD', 'Doctor', 'Master', 'Bachelor', 'MBA'];

  const eduBlocks = sectionText.split(/\n(?=\s*\d{4}|\s*[A-Z][a-z]+\s+\d{4})/).slice(1);

  for (const block of eduBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) continue;

    const datePattern = /(\d{4}[年.\-\/]\s*\d{0,2}[月.\-\/]?|\d{4})\s*[-~～至到]\s*(\d{4}[年.\-\/]\s*\d{0,2}[月.\-\/]?|至今|现在|Present|Now)/i;
    const dateMatch = block.match(datePattern);

    let school = '';
    let degree = '';
    let major = '';

    const schoolPattern = /([\u4e00-\u9fa5A-Za-z0-9\s]{2,30}(?:大学|学院|学校|University|College|Institute|Academy))/i;
    const schoolMatch = block.match(schoolPattern);
    if (schoolMatch) {
      school = schoolMatch[1].trim();
    }

    for (const d of degreeKeywords) {
      if (block.toLowerCase().includes(d.toLowerCase())) {
        degree = d;
        break;
      }
    }

    const majorPattern = /(?:专业|Major)\s*[:：]?\s*([\u4e00-\u9fa5A-Za-z0-9\s]{2,30})/i;
    const majorMatch = block.match(majorPattern);
    if (majorMatch) {
      major = majorMatch[1].trim();
    }

    if (school || degree) {
      educationList.push({
        school: school || '未知学校',
        degree: degree || '未知学历',
        major,
        startDate: dateMatch ? dateMatch[1] : '',
        endDate: dateMatch ? dateMatch[2] : '',
      });
    }
  }

  if (educationList.length === 0) {
    const simpleEdu = text.match(/(?:毕业于|就读于)\s*([\u4e00-\u9fa5A-Za-z0-9\s]{2,20}(?:大学|学院|学校)?)/);
    if (simpleEdu) {
      let degree = '';
      for (const d of degreeKeywords) {
        if (text.toLowerCase().includes(d.toLowerCase())) {
          degree = d;
          break;
        }
      }
      educationList.push({
        school: simpleEdu[1].trim(),
        degree: degree || '未知学历',
        major: '',
        startDate: '',
        endDate: '',
      });
    }
  }

  return educationList;
}

export function parseResume(text: string): ParsedResume {
  return {
    name: extractName(text),
    skills: extractSkills(text),
    workExperience: extractWorkExperience(text),
    education: extractEducation(text),
  };
}
