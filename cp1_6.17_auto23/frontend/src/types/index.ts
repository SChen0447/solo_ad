export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  age: string;
  avatar: string;
  title: string;
}

export interface WorkExperience {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string[];
  highlights: string[];
}

export interface Education {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Project {
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string[];
  techStack: string[];
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  workExperience: WorkExperience[];
  education: Education[];
  projects: Project[];
  skills: string[];
}

export interface Theme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  cardBg: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
  borderRadius: string;
  accent: string;
}

export interface ModuleItem {
  id: string;
  label: string;
  enabled: boolean;
  key: 'workExperience' | 'education' | 'projects' | 'skills';
}

export type ViewMode = 'desktop' | 'mobile';
