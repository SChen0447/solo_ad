import type { ParsedResume, JobRequirement, MatchReport, SkillMatch } from './types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allKeys = new Set([...vecA.keys(), ...vecB.keys()]);
  for (const key of allKeys) {
    const a = vecA.get(key) || 0;
    const b = vecB.get(key) || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateExperienceYears(resume: ParsedResume): number {
  let totalYears = 0;
  const currentYear = new Date().getFullYear();

  for (const exp of resume.workExperience) {
    const startMatch = exp.startDate.match(/\d{4}/);
    const endMatch = exp.endDate.match(/\d{4}/);
    const isCurrent = /至今|现在|Present|Now/i.test(exp.endDate);

    if (startMatch) {
      const startYear = parseInt(startMatch[0]);
      const endYear = endMatch ? parseInt(endMatch[0]) : (isCurrent ? currentYear : startYear);
      totalYears += Math.max(0, endYear - startYear);
    }
  }

  return totalYears;
}

function checkEducationLevel(resume: ParsedResume, requiredLevel: string): boolean {
  const levelRanking: Record<string, number> = {
    '高中': 1,
    '大专': 2,
    '本科': 3,
    '学士': 3,
    'Bachelor': 3,
    '硕士': 4,
    'Master': 4,
    'MBA': 4,
    '博士': 5,
    'PhD': 5,
    'Doctor': 5,
  };

  const requiredRank = levelRanking[requiredLevel] || 3;
  let highestRank = 0;

  for (const edu of resume.education) {
    const rank = levelRanking[edu.degree] || 0;
    if (rank > highestRank) highestRank = rank;
  }

  return highestRank >= requiredRank;
}

function generateSummary(matchPercentage: number, matchedSkills: string[], missingSkills: string[]): string {
  if (matchPercentage >= 85) {
    return `该候选人与职位匹配度极高，核心技能齐全（${matchedSkills.length}项匹配），完全符合岗位要求，强烈推荐进入面试环节。`;
  } else if (matchPercentage >= 70) {
    return `该候选人与职位匹配度较高，核心技能基本齐全（${matchedSkills.length}项匹配），仅缺少少量进阶技能${missingSkills.length > 0 ? '（' + missingSkills.slice(0, 3).join('、') + '）' : ''}，建议安排面试。`;
  } else if (matchPercentage >= 50) {
    return `该候选人与职位匹配度中等，具备部分基础技能（${matchedSkills.length}项匹配），但缺少多项关键技能${missingSkills.length > 0 ? '（' + missingSkills.slice(0, 3).join('、') + '）' : ''}，需要进一步考察或培训。`;
  } else if (matchPercentage >= 30) {
    return `该候选人与职位匹配度较低，技能重叠度不高（仅${matchedSkills.length}项匹配），建议考虑其他更合适的候选人或作为储备人才。`;
  } else {
    return `该候选人与职位匹配度很低，技能要求基本不匹配，不推荐进入后续流程。`;
  }
}

export function matchResume(resume: ParsedResume, job: JobRequirement): MatchReport {
  const resumeSkillsLower = resume.skills.map(s => s.toLowerCase());
  const requiredLower = job.requiredSkills.map(s => s.toLowerCase());
  const preferredLower = job.preferredSkills.map(s => s.toLowerCase());

  const skillMatches: SkillMatch[] = [];
  let matchedSkills: string[] = [];
  let missingSkills: string[] = [];

  for (let i = 0; i < job.requiredSkills.length; i++) {
    const skill = job.requiredSkills[i];
    const matched = resumeSkillsLower.includes(requiredLower[i]);
    skillMatches.push({ skill, matched });
    if (matched) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  for (let i = 0; i < job.preferredSkills.length; i++) {
    const skill = job.preferredSkills[i];
    const matched = resumeSkillsLower.includes(preferredLower[i]);
    skillMatches.push({ skill, matched, isPreferred: true });
    if (matched) {
      matchedSkills.push(skill);
    }
  }

  const requiredMatchRatio = job.requiredSkills.length > 0
    ? matchedSkills.filter(s => job.requiredSkills.includes(s)).length / job.requiredSkills.length
    : 0;

  const preferredMatchRatio = job.preferredSkills.length > 0
    ? matchedSkills.filter(s => job.preferredSkills.includes(s)).length / job.preferredSkills.length
    : 0;

  const resumeText = [
    resume.name,
    ...resume.skills,
    ...resume.workExperience.map(e => `${e.company} ${e.position} ${e.description}`),
    ...resume.education.map(e => `${e.school} ${e.degree} ${e.major}`),
  ].join(' ');

  const jobText = `${job.title} ${job.description} ${job.requiredSkills.join(' ')} ${job.preferredSkills.join(' ')}`;

  const resumeTokens = tokenize(resumeText);
  const jobTokens = tokenize(jobText);
  const resumeTF = computeTF(resumeTokens);
  const jobTF = computeTF(jobTokens);
  const semanticSimilarity = cosineSimilarity(resumeTF, jobTF);

  const experienceYears = calculateExperienceYears(resume);
  const experienceMatch = experienceYears >= job.experienceYears;

  const educationMatch = checkEducationLevel(resume, job.educationLevel);

  const skillScore = requiredMatchRatio * 0.5 + preferredMatchRatio * 0.2;
  const semanticScore = semanticSimilarity * 0.15;
  const experienceScore = (experienceMatch ? 1 : Math.min(1, experienceYears / Math.max(1, job.experienceYears))) * 0.1;
  const educationScore = (educationMatch ? 1 : 0) * 0.05;

  const matchPercentage = Math.round((skillScore + semanticScore + experienceScore + educationScore) * 100);
  const clampedPercentage = Math.max(0, Math.min(100, matchPercentage));

  const overallScore = Math.round((clampedPercentage / 100) * 10);
  const starRating = Math.round((clampedPercentage / 100) * 5);

  const summary = generateSummary(clampedPercentage, matchedSkills, missingSkills);

  return {
    overallScore,
    matchPercentage: clampedPercentage,
    starRating,
    summary,
    skillMatches,
    matchedSkills,
    missingSkills,
    experienceMatch,
    educationMatch,
    semanticSimilarity,
  };
}
