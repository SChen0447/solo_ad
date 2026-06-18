import type { ParsedResume, JobRequirement, MatchReport, SkillMatch } from '../shared/types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const total = tokens.length;
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1 / total);
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
      if (doc.includes(token)) docCount++;
    }
    idf.set(token, Math.log((totalDocs + 1) / (docCount + 1)) + 1);
  }
  return idf;
}

function computeTFIDF(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = computeTF(tokens);
  const tfidf = new Map<string, number>();
  for (const [token, tfVal] of tf.entries()) {
    tfidf.set(token, tfVal * (idf.get(token) || 1));
  }
  return tfidf;
}

function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [key, valA] of vecA.entries()) {
    const valB = vecB.get(key) || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
  }
  for (const valB of vecB.values()) {
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[\s.\-]/g, '');
}

function skillsMatch(skillA: string, skillB: string): boolean {
  const normA = normalizeSkill(skillA);
  const normB = normalizeSkill(skillB);
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  return false;
}

export function matchResume(
  resume: ParsedResume,
  job: JobRequirement
): MatchReport {
  const resumeSkills = resume.skills;
  const allJobSkills = [...job.requiredSkills, ...job.preferredSkills];

  const matchedSkills: SkillMatch[] = [];
  const missingSkills: string[] = [];

  for (const jobSkill of job.requiredSkills) {
    const isMatched = resumeSkills.some(rs => skillsMatch(rs, jobSkill));
    if (isMatched) {
      matchedSkills.push({ skill: jobSkill, matched: true, isPreferred: false });
    } else {
      missingSkills.push(jobSkill);
      matchedSkills.push({ skill: jobSkill, matched: false, isPreferred: false });
    }
  }

  for (const jobSkill of job.preferredSkills) {
    const isMatched = resumeSkills.some(rs => skillsMatch(rs, jobSkill));
    if (isMatched) {
      matchedSkills.push({ skill: jobSkill, matched: true, isPreferred: true });
    } else {
      matchedSkills.push({ skill: jobSkill, matched: false, isPreferred: true });
    }
  }

  const requiredMatched = job.requiredSkills.filter(js =>
    resumeSkills.some(rs => skillsMatch(rs, js))
  ).length;
  const preferredMatched = job.preferredSkills.filter(js =>
    resumeSkills.some(rs => skillsMatch(rs, js))
  ).length;

  const requiredScore = job.requiredSkills.length > 0
    ? requiredMatched / job.requiredSkills.length
    : 0.5;
  const preferredScore = job.preferredSkills.length > 0
    ? preferredMatched / job.preferredSkills.length
    : 0.5;

  const resumeText = [
    resume.name,
    ...resume.skills,
    ...resume.workExperience.map(w => `${w.company} ${w.position} ${w.description}`),
    ...resume.education.map(e => `${e.school} ${e.degree} ${e.major}`),
  ].join(' ');

  const jobText = [
    job.title,
    job.description,
    ...job.requiredSkills,
    ...job.preferredSkills,
    job.experience,
    job.education,
  ].join(' ');

  const resumeTokens = tokenize(resumeText);
  const jobTokens = tokenize(jobText);
  const idf = computeIDF([resumeTokens, jobTokens]);
  const resumeVec = computeTFIDF(resumeTokens, idf);
  const jobVec = computeTFIDF(jobTokens, idf);
  const semanticScore = cosineSimilarity(resumeVec, jobVec);

  const matchPercentage = Math.round(
    requiredScore * 0.5 + preferredScore * 0.2 + semanticScore * 0.3 * 100
  );
  const finalPercentage = Math.min(100, Math.max(0, matchPercentage));

  const overallScore = Math.round((finalPercentage / 100) * 10 * 10) / 10;
  const starRating = Math.round((finalPercentage / 100) * 5 * 2) / 2;

  let summary = '';
  if (finalPercentage >= 85) {
    summary = '该候选人与职位匹配度极高，核心技能齐全，具备优秀的相关经验，强烈推荐进入面试环节。';
  } else if (finalPercentage >= 70) {
    summary = '该候选人与职位匹配度较高，核心技能基本满足，可进一步考察项目经验细节。';
  } else if (finalPercentage >= 50) {
    summary = '该候选人与职位匹配度一般，部分核心技能存在欠缺，建议评估学习能力和成长潜力。';
  } else {
    summary = '该候选人与职位匹配度较低，核心技能缺口较大，建议谨慎评估或考虑其他岗位。';
  }

  return {
    overallScore,
    matchPercentage: finalPercentage,
    matchedSkills,
    missingSkills,
    summary,
    starRating,
  };
}
