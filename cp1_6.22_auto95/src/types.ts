export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  period: string;
  description: string;
}

export interface Work {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export interface ResumeData {
  name: string;
  avatarUrl: string;
  bio: string;
  experiences: WorkExperience[];
  skills: string[];
  works: Work[];
}

export type TemplateId = 'minimal' | 'tech' | 'creative';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  description: string;
}
