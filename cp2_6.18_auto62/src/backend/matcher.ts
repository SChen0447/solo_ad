import type { ParsedResume } from './parser';

export interface JobRequirement {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceYears: number;
  educationLevel: string;
}

export interface SkillMatch {
  skill: string;
  matched: boolean;
  type: 'required' | 'preferred';
}

export interface MatchReport {
  overallScore: number;
  matchPercentage: number;
  skillsMatch: SkillMatch[];
  matchedSkills: string[];
  missingSkills: string[];
  description: string;
  starRating: number;
  experienceMatch: number;
  educationMatch: number;
}

export const jobTemplates: JobRequirement[] = [
  {
    id: 'frontend',
    title: '前端工程师',
    description: '负责公司产品的前端开发工作，参与技术架构设计，优化用户体验。',
    requiredSkills: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS', 'Git'],
    preferredSkills: ['Vue.js', 'Next.js', 'Webpack', 'Vite', 'Node.js', 'UI/UX'],
    experienceYears: 3,
    educationLevel: '本科',
  },
  {
    id: 'backend',
    title: '后端工程师',
    description: '负责后端服务的设计与开发，保障系统高可用、高性能，参与技术选型。',
    requiredSkills: ['Java', 'Spring Boot', 'MySQL', 'Redis', 'Git', 'RESTful'],
    preferredSkills: ['微服务', '分布式', 'Docker', 'Kubernetes', 'MongoDB', 'Linux'],
    experienceYears: 3,
    educationLevel: '本科',
  },
  {
    id: 'datascientist',
    title: '数据科学家',
    description: '负责数据分析与挖掘，构建机器学习模型，为业务决策提供数据支持。',
    requiredSkills: ['Python', 'Machine Learning', 'SQL', '数据分析', 'Pandas', 'NumPy'],
    preferredSkills: ['TensorFlow', 'PyTorch', 'Deep Learning', '数据挖掘', 'Scikit-learn', '统计学'],
    experienceYears: 2,
    educationLevel: '硕士',
  },
];

export function matchResume(resume: ParsedResume, job: JobRequirement): MatchReport {
  const resumeSkillsLower = resume.skills.map(s => s.toLowerCase());
  
  const requiredMatches: SkillMatch[] = job.requiredSkills.map(skill => ({
    skill,
    matched: resumeSkillsLower.some(rs => fuzzyMatch(rs, skill.toLowerCase())),
    type: 'required' as const,
  }));
  
  const preferredMatches: SkillMatch[] = job.preferredSkills.map(skill => ({
    skill,
    matched: resumeSkillsLower.some(rs => fuzzyMatch(rs, skill.toLowerCase())),
    type: 'preferred' as const,
  }));
  
  const allSkillMatches = [...requiredMatches, ...preferredMatches];
  
  const matchedSkills = allSkillMatches.filter(s => s.matched).map(s => s.skill);
  const missingSkills = allSkillMatches.filter(s => !s.matched).map(s => s.skill);
  
  const requiredMatchCount = requiredMatches.filter(s => s.matched).length;
  const preferredMatchCount = preferredMatches.filter(s => s.matched).length;
  
  const requiredScore = job.requiredSkills.length > 0 
    ? (requiredMatchCount / job.requiredSkills.length) * 70 
    : 70;
    
  const preferredScore = job.preferredSkills.length > 0 
    ? (preferredMatchCount / job.preferredSkills.length) * 20 
    : 20;
  
  const experienceScore = calculateExperienceScore(resume, job);
  const educationScore = calculateEducationScore(resume, job);
  
  const finalScore = requiredScore + preferredScore + experienceScore + educationScore;
  const matchPercentage = Math.min(100, Math.round(finalScore));
  const overallScore = Math.round((matchPercentage / 100) * 10) / 1;
  const starRating = Math.round((matchPercentage / 100) * 5 * 2) / 2;
  
  const description = generateDescription(matchPercentage, requiredMatchCount, job.requiredSkills.length);
  
  return {
    overallScore,
    matchPercentage,
    skillsMatch: allSkillMatches,
    matchedSkills,
    missingSkills,
    description,
    starRating,
    experienceMatch: Math.round(experienceScore * 10),
    educationMatch: Math.round(educationScore * 10),
  };
}

function fuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  
  const similarity = calculateSimilarity(a, b);
  return similarity > 0.6;
}

function calculateSimilarity(s1: string, s2: string): number {
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longerLength - distance) / longerLength;
}

function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[s2.length][s1.length];
}

function calculateExperienceScore(resume: ParsedResume, job: JobRequirement): number {
  const totalYears = calculateTotalExperienceYears(resume);
  
  if (totalYears >= job.experienceYears) {
    return 5;
  } else if (totalYears >= job.experienceYears * 0.7) {
    return 3;
  } else if (totalYears >= job.experienceYears * 0.3) {
    return 2;
  }
  return 1;
}

function calculateTotalExperienceYears(resume: ParsedResume): number {
  if (resume.workExperience.length === 0) return 0;
  
  let totalMonths = 0;
  
  for (const exp of resume.workExperience) {
    const startYear = extractYear(exp.startDate);
    const endYear = exp.endDate.includes('至今') || exp.endDate.includes('现在') 
      ? new Date().getFullYear() 
      : extractYear(exp.endDate);
    
    if (startYear > 0) {
      const end = endYear > 0 ? endYear : new Date().getFullYear();
      totalMonths += (end - startYear) * 12;
    }
  }
  
  return Math.max(0, totalMonths / 12);
}

function extractYear(dateStr: string): number {
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
}

function calculateEducationScore(resume: ParsedResume, job: JobRequirement): number {
  if (resume.education.length === 0) return 2;
  
  const levelOrder = ['高中', '大专', '本科', '硕士', '博士', 'PhD', 'Bachelor', 'Master'];
  const jobLevelIndex = levelOrder.findIndex(l => l === job.educationLevel);
  
  let highestLevelIndex = -1;
  for (const edu of resume.education) {
    const idx = levelOrder.findIndex(l => edu.degree.includes(l) || l.includes(edu.degree));
    if (idx > highestLevelIndex) {
      highestLevelIndex = idx;
    }
  }
  
  if (highestLevelIndex >= jobLevelIndex) {
    return 5;
  } else if (highestLevelIndex >= jobLevelIndex - 1) {
    return 3;
  }
  return 1;
}

function generateDescription(matchPercentage: number, matchedCount: number, totalCount: number): string {
  if (matchPercentage >= 85) {
    return `该候选人与职位匹配度很高，核心技能齐全（${matchedCount}/${totalCount}项必备技能），是非常理想的人选。`;
  } else if (matchPercentage >= 70) {
    return `该候选人与职位匹配度较高，大部分核心技能具备（${matchedCount}/${totalCount}项必备技能），有较大培养潜力。`;
  } else if (matchPercentage >= 50) {
    return `该候选人与职位有一定匹配度（${matchedCount}/${totalCount}项必备技能），部分关键技能需要补充。`;
  } else {
    return `该候选人与职位匹配度较低（${matchedCount}/${totalCount}项必备技能），需要在多个技能方向提升。`;
  }
}
