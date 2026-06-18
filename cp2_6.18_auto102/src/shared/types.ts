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
}

export interface JobRequirement {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experience: string;
  education: string;
}

export interface SkillMatch {
  skill: string;
  matched: boolean;
  isPreferred: boolean;
}

export interface MatchReport {
  overallScore: number;
  matchPercentage: number;
  matchedSkills: SkillMatch[];
  missingSkills: string[];
  summary: string;
  starRating: number;
}

export interface HistoryRecord {
  id: string;
  fileName: string;
  jobTitle: string;
  matchPercentage: number;
  timestamp: number;
  parsedResume: ParsedResume;
  report: MatchReport;
}
