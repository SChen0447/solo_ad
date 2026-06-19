export interface Education {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
}

export interface ProjectExperience {
  name: string;
  description: string;
  skills: string[];
  context: string;
}

export interface ParsedResume {
  id: string;
  education: Education[];
  skills: string[];
  projects: ProjectExperience[];
  rawText: string;
  skillOccurrences: Record<string, number>;
  skillContexts: Record<string, string[]>;
}

export interface SkillMatch {
  skill: string;
  score: number;
  occurrences: number;
  contexts: string[];
  suggestedKeywords: string[];
}

export interface JobTemplate {
  id: string;
  name: string;
  requiredSkills: string[];
  relatedKeywords: Record<string, string[]>;
}

export interface MatchResult {
  overallScore: number;
  skills: SkillMatch[];
  jobId: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
