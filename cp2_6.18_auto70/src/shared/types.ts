export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
}

export interface ParsedResume {
  name: string;
  skills: string[];
  workExperience: WorkExperience[];
  education: Education[];
  rawText: string;
}

export interface JobRequirement {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
}

export interface SkillMatch {
  skill: string;
  matched: boolean;
  isRequired: boolean;
}

export interface MatchReport {
  overallScore: number;
  matchPercentage: number;
  summary: string;
  skillMatches: SkillMatch[];
  matchedSkills: string[];
  missingSkills: string[];
  resumeName: string;
  jobTitle: string;
}

export interface HistoryRecord {
  id: string;
  fileName: string;
  jobTitle: string;
  matchPercentage: number;
  overallScore: number;
  timestamp: number;
  parsedResume: ParsedResume;
  matchReport: MatchReport;
}
