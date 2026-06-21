export interface Skill {
  id: number;
  name: string;
  category: 'frontend' | 'backend' | 'database' | 'testing' | 'devops';
}

export interface MemberSkill {
  skillId: number;
  skillName: string;
  category: string;
  proficiency: number;
  lastUpdated: string;
}

export interface Project {
  id: number;
  name: string;
  role: string;
}

export interface Member {
  id: number;
  name: string;
  avatar: string;
  skills: MemberSkill[];
  projects: Project[];
  currentProjectCount: number;
}

export interface MatchDetail {
  skillName: string;
  category: string;
  required: number;
  actual: number;
  weight: number;
}

export interface MatchResult {
  memberId: number;
  memberName: string;
  matchPercentage: number;
  meetsRequirements: boolean;
  details: MatchDetail[];
}

export interface ProjectRequirementSkill {
  skillId: number;
  minProficiency: number;
  weight: number;
}

export interface ProjectRequirement {
  name: string;
  skills: ProjectRequirementSkill[];
}

export const categoryColors: Record<string, { bg: string; text: string }> = {
  frontend: { bg: '#3b82f6', text: '#ffffff' },
  backend: { bg: '#22c55e', text: '#ffffff' },
  database: { bg: '#a855f7', text: '#ffffff' },
  testing: { bg: '#eab308', text: '#1f2937' },
  devops: { bg: '#6b7280', text: '#ffffff' },
};

export const categoryNames: Record<string, string> = {
  frontend: '前端',
  backend: '后端',
  database: '数据库',
  testing: '测试',
  devops: '运维',
};
