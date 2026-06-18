import type { ParsedResume, JobRequirement, MatchReport, SkillMatch } from '../types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
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

function computeIDF(documents: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const totalDocs = documents.length;
  const allTokens = new Set<string>();
  for (const doc of documents) {
    for (const token of new Set(doc)) {
      allTokens.add(token);
    }
  }
  for (const token of allTokens) {
    let docCount = 0;
    for (const doc of documents) {
      if (doc.includes(token)) {
        docCount++;
      }
    }
    idf.set(token, Math.log((totalDocs + 1) / (docCount + 1)) + 1);
  }
  return idf;
}

function computeTFIDFVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = computeTF(tokens);
  const tfidf = new Map<string, number>();
  for (const [token, tfValue] of tf) {
    tfidf.set(token, tfValue * (idf.get(token) || 0));
  }
  return tfidf;
}

function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const [token, valA] of vecA) {
    const valB = vecB.get(token) || 0;
    dotProduct += valA * valB;
    magA += valA * valA;
  }
  for (const val of vecB.values()) {
    magB += val * val;
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (magA * magB);
}

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[\s.\-]/g, '');
}

function skillsMatch(resumeSkill: string, jobSkill: string): boolean {
  const normResume = normalizeSkill(resumeSkill);
  const normJob = normalizeSkill(jobSkill);
  if (normResume === normJob) return true;
  if (normResume.includes(normJob) || normJob.includes(normResume)) return true;
  return false;
}

export function matchResumeToJob(
  parsedResume: ParsedResume,
  jobRequirement: JobRequirement
): MatchReport {
  const resumeTokens = tokenize(parsedResume.rawText);
  const jobText = `${jobRequirement.title} ${jobRequirement.description} ${jobRequirement.requiredSkills.join(' ')} ${jobRequirement.preferredSkills.join(' ')}`;
  const jobTokens = tokenize(jobText);

  const idf = computeIDF([resumeTokens, jobTokens]);
  const resumeVec = computeTFIDFVector(resumeTokens, idf);
  const jobVec = computeTFIDFVector(jobTokens, idf);
  const semanticScore = cosineSimilarity(resumeVec, jobVec);

  const skillMatches: SkillMatch[] = [];
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const reqSkill of jobRequirement.requiredSkills) {
    const matched = parsedResume.skills.some(s => skillsMatch(s, reqSkill));
    skillMatches.push({ skill: reqSkill, matched, type: 'required' });
    if (matched) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  for (const prefSkill of jobRequirement.preferredSkills) {
    const matched = parsedResume.skills.some(s => skillsMatch(s, prefSkill));
    skillMatches.push({ skill: prefSkill, matched, type: 'preferred' });
    if (matched) matchedSkills.push(prefSkill);
  }

  const requiredCount = jobRequirement.requiredSkills.length;
  const preferredCount = jobRequirement.preferredSkills.length;
  const requiredMatched = jobRequirement.requiredSkills.filter(s =>
    parsedResume.skills.some(rs => skillsMatch(rs, s))
  ).length;
  const preferredMatched = jobRequirement.preferredSkills.filter(s =>
    parsedResume.skills.some(rs => skillsMatch(rs, s))
  ).length;

  let skillScore = 0;
  if (requiredCount > 0) {
    skillScore += (requiredMatched / requiredCount) * 0.6;
  }
  if (preferredCount > 0) {
    skillScore += (preferredMatched / preferredCount) * 0.25;
  }
  skillScore += semanticScore * 0.15;

  let totalYears = 0;
  for (const exp of parsedResume.workExperience) {
    const start = parseInt(exp.startDate);
    let end = exp.endDate === '至今' || exp.endDate === '现在' ? new Date().getFullYear() : parseInt(exp.endDate);
    if (!isNaN(start) && !isNaN(end)) {
      totalYears += Math.max(0, end - start);
    }
  }
  const experienceMatch = totalYears >= jobRequirement.experienceYears;
  if (experienceMatch) skillScore += 0.05;

  const eduLevels = ['高中', '大专', '本科', '学士', '硕士', '研究生', '博士'];
  const jobLevel = eduLevels.indexOf(jobRequirement.educationLevel);
  let maxResumeLevel = -1;
  for (const edu of parsedResume.education) {
    const idx = eduLevels.findIndex(l => edu.degree.includes(l) || edu.school.includes(l));
    if (idx > maxResumeLevel) maxResumeLevel = idx;
  }
  const educationMatch = maxResumeLevel >= jobLevel;
  if (educationMatch) skillScore += 0.05;

  const finalScore = Math.min(1, Math.max(0, skillScore));
  const matchPercentage = Math.round(finalScore * 100);
  const starRating = Math.round(finalScore * 5);

  let summary = '';
  if (matchPercentage >= 85) {
    summary = '该候选人与职位匹配度非常高，核心技能齐全，具备优秀的工作经验和教育背景，强烈推荐进入面试环节。';
  } else if (matchPercentage >= 70) {
    summary = '该候选人与职位匹配度较高，核心技能基本满足，可考虑进一步面试沟通。';
  } else if (matchPercentage >= 50) {
    summary = '该候选人与职位匹配度一般，部分核心技能缺失，建议综合评估后决定是否面试。';
  } else if (matchPercentage >= 30) {
    summary = '该候选人与职位匹配度较低，多项核心技能不匹配，需谨慎评估。';
  } else {
    summary = '该候选人与职位匹配度很低，技能和背景与岗位要求差距较大，不推荐进入面试。';
  }

  return {
    overallScore: Math.round(finalScore * 10) / 10,
    matchPercentage,
    starRating,
    summary,
    skillMatches,
    matchedSkills,
    missingSkills,
    experienceMatch,
    educationMatch,
  };
}
