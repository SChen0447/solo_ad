export interface Education {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  skills: string[];
}

export interface Skill {
  name: string;
  count: number;
  contexts: string[];
}

export interface ParsedResume {
  id: string;
  rawText: string;
  education: Education[];
  skills: Skill[];
  projects: Project[];
}

export interface SkillMatch {
  skill: string;
  required: boolean;
  score: number;
  count: number;
  contexts: string[];
  suggestions?: string[];
}

export interface MatchResult {
  overallScore: number;
  skills: SkillMatch[];
  job: JobRequirement;
}

export interface JobRequirement {
  id: string;
  name: string;
  skills: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
