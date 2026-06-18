import type { ParsedResume, JobRequirement, MatchReport, SkillMatch } from '../shared/types';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its',
  'our', 'their', 'not', 'no', 'nor', 'so', 'if', 'then', 'than',
  'too', 'very', 'just', 'also', 'about', 'up', 'out', 'all',
  '的', '了', '和', '与', '及', '或', '在', '是', '为', '对',
  '我', '你', '他', '她', '它', '们', '有', '被', '把', '将',
  '会', '要', '不', '也', '就', '都', '而', '及', '等', '个',
  '中', '上', '下', '年', '月', '日', '时', '分', '到', '以',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5+\-#.\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0 && !STOP_WORDS.has(t));
}

function computeTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const total = tokens.length;
  if (total === 0) return tf;
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1 / total);
  }
  return tf;
}

function computeDocumentFrequency(documents: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  const totalDocs = documents.length;
  for (const doc of documents) {
    const uniqueTokens = new Set(doc);
    for (const token of uniqueTokens) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [token, freq] of df.entries()) {
    idf.set(token, Math.log((totalDocs + 1) / (freq + 1)) + 1);
  }
  return idf;
}

function computeTFIDFVector(
  tokens: string[],
  idf: Map<string, number>,
  vocabulary: Set<string>
): Map<string, number> {
  const tf = computeTermFrequency(tokens);
  const tfidf = new Map<string, number>();
  for (const token of vocabulary) {
    const tfVal = tf.get(token) || 0;
    const idfVal = idf.get(token) || 0;
    tfidf.set(token, tfVal * idfVal);
  }
  return tfidf;
}

function cosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>
): number {
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

function buildSkillVocabulary(resumeSkills: string[], jobSkills: string[]): Set<string> {
  const vocab = new Set<string>();
  for (const s of [...resumeSkills, ...jobSkills]) {
    const tokens = tokenize(s);
    for (const t of tokens) vocab.add(t);
    vocab.add(normalizeSkill(s));
  }
  return vocab;
}

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[\s.\-]/g, '');
}

function skillsMatch(skillA: string, skillB: string): boolean {
  const normA = normalizeSkill(skillA);
  const normB = normalizeSkill(skillB);
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  const tokensA = new Set(tokenize(skillA));
  const tokensB = new Set(tokenize(skillB));
  if (tokensA.size > 0 && tokensB.size > 0) {
    let shared = 0;
    for (const t of tokensA) if (tokensB.has(t)) shared++;
    if (shared / Math.min(tokensA.size, tokensB.size) >= 0.6) return true;
  }
  return false;
}

function computeSemanticScore(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return 0.3;
  }

  const idf = computeDocumentFrequency([tokensA, tokensB]);
  const vocabulary = new Set([...tokensA, ...tokensB]);
  const vecA = computeTFIDFVector(tokensA, idf, vocabulary);
  const vecB = computeTFIDFVector(tokensB, idf, vocabulary);

  return cosineSimilarity(vecA, vecB);
}

function computeSkillSemanticScore(
  resumeSkills: string[],
  jobReqSkills: string[],
  jobPrefSkills: string[]
): number {
  if (jobReqSkills.length === 0 && jobPrefSkills.length === 0) return 0.5;

  const vocab = buildSkillVocabulary(resumeSkills, [...jobReqSkills, ...jobPrefSkills]);
  const documents: string[][] = [];

  const resumeSkillTokens: string[] = [];
  for (const s of resumeSkills) resumeSkillTokens.push(...tokenize(s));
  documents.push(resumeSkillTokens);

  const jobSkillTokens: string[] = [];
  for (const s of [...jobReqSkills, ...jobPrefSkills]) jobSkillTokens.push(...tokenize(s));
  documents.push(jobSkillTokens);

  const idf = computeDocumentFrequency(documents);
  const resumeVec = computeTFIDFVector(resumeSkillTokens, idf, vocab);
  const jobVec = computeTFIDFVector(jobSkillTokens, idf, vocab);

  const sim = cosineSimilarity(resumeVec, jobVec);

  let weighted = 0;
  let totalWeight = 0;
  for (const s of jobReqSkills) {
    const sTokens = tokenize(s);
    const sVec = computeTFIDFVector(sTokens, idf, vocab);
    const sSim = cosineSimilarity(resumeVec, sVec);
    let bestMatch = 0;
    for (const rs of resumeSkills) {
      if (skillsMatch(rs, s)) { bestMatch = 1; break; }
      const rsTokens = tokenize(rs);
      const rsVec = computeTFIDFVector(rsTokens, idf, vocab);
      bestMatch = Math.max(bestMatch, cosineSimilarity(rsVec, sVec));
    }
    weighted += Math.max(sSim, bestMatch) * 2;
    totalWeight += 2;
  }
  for (const s of jobPrefSkills) {
    const sTokens = tokenize(s);
    const sVec = computeTFIDFVector(sTokens, idf, vocab);
    const sSim = cosineSimilarity(resumeVec, sVec);
    let bestMatch = 0;
    for (const rs of resumeSkills) {
      if (skillsMatch(rs, s)) { bestMatch = 1; break; }
      const rsTokens = tokenize(rs);
      const rsVec = computeTFIDFVector(rsTokens, idf, vocab);
      bestMatch = Math.max(bestMatch, cosineSimilarity(rsVec, sVec));
    }
    weighted += Math.max(sSim, bestMatch);
    totalWeight += 1;
  }

  const avgBestMatch = totalWeight > 0 ? weighted / totalWeight : 0;
  return (sim + avgBestMatch) / 2;
}

export function matchResume(
  resume: ParsedResume,
  job: JobRequirement
): MatchReport {
  const resumeSkills = resume.skills;

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

  const resumeFullText = [
    resume.name,
    ...resume.skills,
    ...resume.workExperience.map(w => `${w.company} ${w.position} ${w.description}`),
    ...resume.education.map(e => `${e.school} ${e.degree} ${e.major}`),
  ].join(' ');

  const jobFullText = [
    job.title,
    job.description,
    ...job.requiredSkills,
    ...job.preferredSkills,
    job.experience,
    job.education,
  ].join(' ');

  const overallSemanticScore = computeSemanticScore(resumeFullText, jobFullText);
  const skillSemanticScore = computeSkillSemanticScore(
    resume.skills,
    job.requiredSkills,
    job.preferredSkills
  );

  const finalSemantic = (overallSemanticScore * 0.4 + skillSemanticScore * 0.6);

  const compositeScore =
    requiredScore * 0.45 +
    preferredScore * 0.20 +
    finalSemantic * 0.35;

  const matchPercentage = Math.round(compositeScore * 100);
  const finalPercentage = Math.min(100, Math.max(0, matchPercentage));

  const overallScore = Math.round((finalPercentage / 100) * 10 * 10) / 10;
  const starRating = Math.round((finalPercentage / 100) * 5 * 2) / 2;

  let summary = '';
  if (finalPercentage >= 85) {
    summary = `该候选人与${job.title}职位匹配度极高，核心技能齐全（${requiredMatched}/${job.requiredSkills.length}项必备技能匹配），具备优秀的相关经验，语义契合度高，强烈推荐进入面试环节。`;
  } else if (finalPercentage >= 70) {
    summary = `该候选人与${job.title}职位匹配度较高，${requiredMatched}/${job.requiredSkills.length}项核心技能满足，语义契合度良好，可进一步考察项目经验细节和${missingSkills.slice(0, 2).join('、')}等技能的学习能力。`;
  } else if (finalPercentage >= 50) {
    summary = `该候选人与${job.title}职位匹配度一般，仅有${requiredMatched}/${job.requiredSkills.length}项核心技能匹配，建议评估学习能力和成长潜力，重点关注${missingSkills.slice(0, 3).join('、')}等关键技能缺口。`;
  } else {
    summary = `该候选人与${job.title}职位匹配度较低，核心技能缺口较大（${job.requiredSkills.length - requiredMatched}/${job.requiredSkills.length}项缺失），语义契合度不足，建议谨慎评估或考虑其他更匹配的岗位。`;
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
