export type SkillCategory = 'frontend' | 'backend' | 'devops' | 'data' | 'design' | 'management';

export interface Skill {
  name: string;
  category: SkillCategory;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  level: 'junior' | 'senior';
  skills: Skill[];
}

export interface Course {
  id: string;
  title: string;
  duration: number;
  difficulty: 'low' | 'medium' | 'high';
  targetSkill: string;
}

export interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  completed: boolean;
}

export interface LearningPath {
  employeeId: string;
  courses: Course[];
  milestones: Milestone[];
}

export interface Progress {
  employeeId: string;
  employeeName: string;
  skills: number;
  courseCompletion: number;
  testScore: number;
  attendance: number;
}
