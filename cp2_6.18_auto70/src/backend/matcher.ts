import type { ParsedResume, JobRequirement, MatchReport, SkillMatch } from '../shared/types';

function tokenize(text: string): string[] {
  const lowerText = text.toLowerCase();
  const words = lowerText.match(/[a-z]+|[\u4e00-\u9fa5]+/g) || [];
  const stopWords = new Set(['的', '了', '和', '与', '在', '是', '有', '我', '及', '等', '以', '为', '对', '从', '到', 'the', 'a', 'an', 'is', 'are', 'of', 'in', 'on', 'and', 'or', 'to', 'for', 'with']);
  return words.filter(w => w.length >= 2 && !stopWords.has(w));
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  const total = tokens.length || 1;
  for (const [key, val] of tf) {
    tf.set(key, val / total);
  }
  return tf;
}

function computeIDF(allDocs: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const totalDocs = allDocs.length;
  const allTerms = new Set<string>();
  for (const doc of allDocs) {
    for (const term of new Set(doc)) {
      allTerms.add(term);
    }
  }
  for (const term of allTerms) {
    let docCount = 0;
    for (const doc of allDocs) {
      if (doc.includes(term)) docCount++;
    }
    idf.set(term, Math.log((totalDocs + 1) / (docCount + 1)) + 1);
  }
  return idf;
}

function computeTFIDFVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = computeTF(tokens);
  const vector = new Map<string, number>();
  for (const [term, tfVal] of tf) {
    vector.set(term, tfVal * (idf.get(term) || 0));
  }
  return vector;
}

function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const allTerms = new Set([...vecA.keys(), ...vecB.keys()]);
  for (const term of allTerms) {
    const a = vecA.get(term) || 0;
    const b = vecB.get(term) || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[\s.\-]/g, '');
}

function skillsMatch(resumeSkill: string, requiredSkill: string): boolean {
  const a = normalizeSkill(resumeSkill);
  const b = normalizeSkill(requiredSkill);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

function generateSummary(percentage: number, matchedCount: number, requiredCount: number, missingCount: number): string {
  if (percentage >= 85) {
    return `该候选人与职位匹配度极高，核心技能齐全，具备 ${matchedCount}/${requiredCount} 项必备技能，强烈推荐进入面试环节。`;
  } else if (percentage >= 70) {
    return `该候选人与职位匹配度较高，核心技能基本满足，具备 ${matchedCount}/${requiredCount} 项必备技能，建议进一步考察。`;
  } else if (percentage >= 50) {
    return `该候选人与职位匹配度中等，部分核心技能匹配，具备 ${matchedCount}/${requiredCount} 项必备技能，${missingCount}项技能需要补充，可根据团队情况评估。`;
  } else {
    return `该候选人与职位匹配度较低，核心技能差距较大，仅具备 ${matchedCount}/${requiredCount} 项必备技能，暂不推荐。`;
  }
}

export function matchResume(
  resume: ParsedResume,
  job: JobRequirement
): MatchReport {
  const resumeSkills = resume.skills;
  const requiredSkills = job.requiredSkills;
  const preferredSkills = job.preferredSkills;
  const allJobSkills = [...requiredSkills, ...preferredSkills];

  const skillMatches: SkillMatch[] = [];
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const reqSkill of requiredSkills) {
    const isMatch = resumeSkills.some(rs => skillsMatch(rs, reqSkill));
    skillMatches.push({
      skill: reqSkill,
      matched: isMatch,
      isRequired: true
    });
    if (isMatch) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  }

  for (const prefSkill of preferredSkills) {
    if (!skillMatches.some(sm => skillsMatch(sm.skill, prefSkill))) {
      const isMatch = resumeSkills.some(rs => skillsMatch(rs, prefSkill));
      skillMatches.push({
        skill: prefSkill,
        matched: isMatch,
        isRequired: false
      });
      if (isMatch && !matchedSkills.includes(prefSkill)) {
        matchedSkills.push(prefSkill);
      } else if (!isMatch && !missingSkills.includes(prefSkill)) {
        missingSkills.push(prefSkill);
      }
    }
  }

  const resumeTokens = tokenize(resume.rawText + ' ' + resumeSkills.join(' '));
  const jobTokens = tokenize(job.description + ' ' + job.requiredSkills.join(' ') + ' ' + job.responsibilities.join(' '));
  const allDocs = [resumeTokens, jobTokens];
  const idf = computeIDF(allDocs);
  const resumeVec = computeTFIDFVector(resumeTokens, idf);
  const jobVec = computeTFIDFVector(jobTokens, idf);
  const semanticSim = cosineSimilarity(resumeVec, jobVec);

  const requiredMatchCount = requiredSkills.filter(rs =>
    resumeSkills.some(skill => skillsMatch(skill, rs))
  ).length;
  const requiredScore = requiredSkills.length > 0
    ? (requiredMatchCount / requiredSkills.length) * 0.6
    : 0.3;

  const preferredMatchCount = preferredSkills.filter(ps =>
    resumeSkills.some(skill => skillsMatch(skill, ps))
  ).length;
  const preferredScore = preferredSkills.length > 0
    ? (preferredMatchCount / preferredSkills.length) * 0.2
    : 0.1;

  const semanticScore = semanticSim * 0.2;

  const matchPercentage = Math.round(
    Math.min(100, (requiredScore + preferredScore + semanticScore) * 100)
  );

  const overallScore = Math.max(1, Math.min(10, Math.round(matchPercentage / 10)));

  const summary = generateSummary(
    matchPercentage,
    requiredMatchCount,
    requiredSkills.length,
    missingSkills.length
  );

  return {
    overallScore,
    matchPercentage,
    summary,
    skillMatches,
    matchedSkills,
    missingSkills,
    resumeName: resume.name,
    jobTitle: job.title
  };
}

export const JOB_TEMPLATES: JobRequirement[] = [
  {
    id: 'frontend',
    title: '前端工程师',
    description: '负责公司Web前端产品的设计与开发，参与前端架构设计，优化用户体验和页面性能，与后端工程师协作完成产品功能。',
    requiredSkills: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS'],
    preferredSkills: ['Vue', 'Next.js', 'Redux', 'Webpack', 'Vite', 'Node.js', 'Jest'],
    responsibilities: [
      '负责Web前端页面的开发与维护',
      '优化前端性能，提升用户体验',
      '参与前端技术选型和架构设计',
      '与产品、设计、后端团队紧密协作'
    ]
  },
  {
    id: 'backend',
    title: '后端工程师',
    description: '负责公司后端服务的设计、开发和维护，保障系统的高可用性和可扩展性，参与技术方案评审，推动系统架构演进。',
    requiredSkills: ['Node.js', 'Java', 'MySQL', 'MongoDB', 'RESTful'],
    preferredSkills: ['Python', 'Go', 'Redis', 'Docker', 'Kubernetes', '微服务', 'Spring Boot'],
    responsibilities: [
      '负责后端API服务的设计与开发',
      '数据库设计与性能优化',
      '保障系统稳定性和高可用性',
      '参与技术方案评审和代码Review'
    ]
  },
  {
    id: 'data-scientist',
    title: '数据科学家',
    description: '负责公司数据分析和机器学习模型的研发，从数据中挖掘商业价值，为业务决策提供数据支撑，推动数据驱动的产品迭代。',
    requiredSkills: ['Python', 'Machine Learning', 'SQL', 'Pandas', 'NumPy'],
    preferredSkills: ['TensorFlow', 'PyTorch', 'Deep Learning', 'NLP', 'Spark', 'Hadoop', 'Data Analysis'],
    responsibilities: [
      '负责数据分析和数据挖掘工作',
      '机器学习模型的训练与优化',
      '构建数据指标体系，监控业务运行',
      '与业务团队协作，推动数据产品落地'
    ]
  }
];
