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
  graduationDate: string;
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

export interface HistoryRecord {
  id: string;
  fileName: string;
  jobId: string;
  jobTitle: string;
  matchPercentage: number;
  resume: ParsedResume;
  report: MatchReport;
  timestamp: number;
}
