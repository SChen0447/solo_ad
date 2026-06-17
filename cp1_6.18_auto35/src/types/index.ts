export type BlockType = 'personal' | 'experience' | 'education' | 'skills' | 'projects';

export interface Theme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  cardBg: string;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  dividerColor: string;
}

export interface PersonalInfoData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  avatar?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface SkillItem {
  id: string;
  name: string;
  level?: number;
}

export interface ProjectItem {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  link?: string;
}

export type BlockData =
  | PersonalInfoData
  | { items: ExperienceItem[] }
  | { items: EducationItem[] }
  | { items: SkillItem[] }
  | { items: ProjectItem[] };

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  data: BlockData;
}

export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

export interface Resume {
  id: string;
  title: string;
  themeId: string;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
}

export interface BuilderModule {
  type: BlockType;
  title: string;
  icon: string;
  description: string;
}

export const THEMES: Theme[] = [
  {
    id: 'blue-gray',
    name: '经典蓝灰',
    primary: '#2c3e50',
    secondary: '#3498db',
    background: '#f5f5f5',
    cardBg: '#ffffff',
    textColor: '#2c3e50',
    textSecondary: '#7f8c8d',
    borderColor: '#e0e0e0',
    dividerColor: '#e8e8e8'
  },
  {
    id: 'dark-green',
    name: '沉稳墨绿',
    primary: '#1a3c34',
    secondary: '#2d6a4f',
    background: '#f0f4f1',
    cardBg: '#ffffff',
    textColor: '#1a3c34',
    textSecondary: '#5c7a6f',
    borderColor: '#d4ded6',
    dividerColor: '#e0e8e2'
  },
  {
    id: 'warm-brown',
    name: '暖棕米色',
    primary: '#5c4033',
    secondary: '#c17817',
    background: '#faf6f0',
    cardBg: '#fffdf8',
    textColor: '#5c4033',
    textSecondary: '#8b7355',
    borderColor: '#e8ddd0',
    dividerColor: '#f0e6d8'
  }
];

export const BUILDER_MODULES: BuilderModule[] = [
  {
    type: 'personal',
    title: '个人信息',
    icon: '👤',
    description: '姓名、联系方式、简介'
  },
  {
    type: 'experience',
    title: '工作经历',
    icon: '💼',
    description: '职业经历与成就'
  },
  {
    type: 'education',
    title: '教育背景',
    icon: '🎓',
    description: '学历与教育经历'
  },
  {
    type: 'skills',
    title: '技能标签',
    icon: '⚡',
    description: '专业技能与特长'
  },
  {
    type: 'projects',
    title: '项目展示',
    icon: '🚀',
    description: '代表作品与项目经验'
  }
];
