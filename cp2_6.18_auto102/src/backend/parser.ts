import type { ParsedResume, WorkExperience, Education } from '../shared/types';

const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
  'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin',
  'HTML', 'CSS', 'Sass', 'Less', 'Webpack', 'Vite', 'Rollup',
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Linux', 'Git',
  'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'Machine Learning',
  'Deep Learning', 'Data Analysis', 'Data Visualization', 'Tableau',
  'REST API', 'GraphQL', 'Microservices', 'Agile', 'Scrum',
  'Spring', 'Spring Boot', 'Django', 'Flask', 'FastAPI',
  'Next.js', 'Nuxt.js', 'Svelte', 'Tailwind CSS', 'Redux', 'MobX',
  'Jest', 'Mocha', 'Cypress', 'Selenium', 'CI/CD', 'Jenkins',
  'Figma', 'Photoshop', 'UI/UX', 'Responsive Design',
];

function extractName(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '未知候选人';

  const namePatterns = [
    /^(?:姓\s*名|Name)\s*[:：]\s*(.+)$/i,
    /^([\u4e00-\u9fa5]{2,4})\s*$/,
    /^([A-Z][a-zA-Z\s]{1,30})$/
  ];

  for (const pattern of namePatterns) {
    for (const line of lines.slice(0, 10)) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
  }

  return lines[0].substring(0, 20);
}

function extractSkills(text: string): string[] {
  const foundSkills: Set<string> = new Set();
  const lowerText = text.toLowerCase();

  for (const skill of COMMON_SKILLS) {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      foundSkills.add(skill);
    }
  }

  const skillSectionPatterns = [
    /(?:技\s*能|Skills?|技术栈|专业技能)\s*[:：]?\s*([\s\S]*?)(?=\n\s*(?:工作经历|教育背景|项目经验|Experience|Education|$))/i,
  ];

  for (const pattern of skillSectionPatterns) {
    const match = text.match(pattern);
    if (match) {
      const skillsText = match[1];
      const splitSkills = skillsText.split(/[,，、;；\n/|]/).map(s => s.trim()).filter(Boolean);
      for (const s of splitSkills) {
        if (s.length > 1 && s.length < 30) {
          foundSkills.add(s);
        }
      }
    }
  }

  return Array.from(foundSkills);
}

function extractWorkExperience(text: string): WorkExperience[] {
  const experiences: WorkExperience[] = [];

  const sectionPattern = /(?:工作经历|工作经验|职业经历|Work\s*Experience|Experience)\s*[:：]?\s*([\s\S]*?)(?=\n\s*(?:教育背景|项目经验|技能|Education|Projects?|Skills|$))/i;
  const sectionMatch = text.match(sectionPattern);

  if (!sectionMatch) return experiences;

  const sectionText = sectionMatch[1];

  const expBlocks = sectionText.split(/\n\s*\n/).filter(b => b.trim().length > 0);

  for (const block of expBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let company = '';
    let position = '';
    let startDate = '';
    let endDate = '';
    let description = '';

    const datePattern = /(\d{4}[\-/.年]\s*\d{0,2}[\-/.月]?)\s*[~～\-至到]\s*(\d{4}[\-/.年]\s*\d{0,2}[\-/.月]?|至今|现在|Present|Now)/i;
    const dateMatch = block.match(datePattern);
    if (dateMatch) {
      startDate = dateMatch[1].replace(/[年月]/g, '-').replace(/[/.]/g, '-').replace(/-$/, '');
      endDate = dateMatch[2].replace(/[年月]/g, '-').replace(/[/.]/g, '-').replace(/-$/, '');
    }

    const firstLine = lines[0];
    const parts = firstLine.split(/\s+[|｜·•\-]\s+|\s{2,}|[,，]/);
    if (parts.length >= 2) {
      company = parts[0].trim();
      position = parts[1].trim();
    } else {
      position = firstLine;
    }

    const remainingLines = lines.slice(1).filter(l => !datePattern.test(l));
    description = remainingLines.join('；');

    if (position || company) {
      experiences.push({
        company: company || '未知公司',
        position: position || '未知职位',
        startDate,
        endDate,
        description,
      });
    }
  }

  return experiences;
}

function extractEducation(text: string): Education[] {
  const educations: Education[] = [];

  const sectionPattern = /(?:教育背景|教育经历|学历|Education)\s*[:：]?\s*([\s\S]*?)(?=\n\s*(?:工作经历|项目经验|技能|Experience|Projects?|Skills|$))/i;
  const sectionMatch = text.match(sectionPattern);

  if (!sectionMatch) return educations;

  const sectionText = sectionMatch[1];
  const eduBlocks = sectionText.split(/\n\s*\n/).filter(b => b.trim().length > 0);

  const degreeKeywords = ['博士', '硕士', '本科', '学士', '大专', '高中', 'PhD', 'Ph.D', 'Master', 'Bachelor', 'MBA', 'College'];

  for (const block of eduBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 1) continue;

    let school = '';
    let degree = '';
    let major = '';
    let startDate = '';
    let endDate = '';

    const datePattern = /(\d{4}[\-/.年]\s*\d{0,2}[\-/.月]?)\s*[~～\-至到]\s*(\d{4}[\-/.年]\s*\d{0,2}[\-/.月]?|至今|现在|Present|Now)/i;
    const dateMatch = block.match(datePattern);
    if (dateMatch) {
      startDate = dateMatch[1].replace(/[年月]/g, '-').replace(/[/.]/g, '-').replace(/-$/, '');
      endDate = dateMatch[2].replace(/[年月]/g, '-').replace(/[/.]/g, '-').replace(/-$/, '');
    }

    const lowerBlock = block.toLowerCase();
    for (const kw of degreeKeywords) {
      if (lowerBlock.includes(kw.toLowerCase())) {
        degree = kw;
        break;
      }
    }

    const schoolKeywords = ['大学', '学院', 'University', 'College', 'Institute', 'School'];
    for (const line of lines) {
      for (const kw of schoolKeywords) {
        if (line.includes(kw)) {
          school = line.split(/\s+[|｜·•\-]\s+|[,，]/)[0].trim();
          break;
        }
      }
      if (school) break;
    }

    const majorKeywords = ['专业', 'Major'];
    for (const line of lines) {
      for (const kw of majorKeywords) {
        if (line.includes(kw)) {
          const majorMatch = line.match(/(?:专业|Major)\s*[:：]?\s*(.+)/i);
          if (majorMatch) {
            major = majorMatch[1].trim();
          }
        }
      }
    }

    if (!school && lines.length > 0) {
      school = lines[0].split(/\s+[|｜·•\-]\s+|[,，]/)[0].trim();
    }

    if (school || degree) {
      educations.push({
        school: school || '未知学校',
        degree: degree || '未知学历',
        major,
        startDate,
        endDate,
      });
    }
  }

  return educations;
}

export function parseResume(text: string): ParsedResume {
  return {
    name: extractName(text),
    skills: extractSkills(text),
    workExperience: extractWorkExperience(text),
    education: extractEducation(text),
  };
}
