export type CourseType = 'pottery' | 'weaving' | 'embroidery' | 'woodcarving' | 'painting' | 'jewelry';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Course {
  id: string;
  title: string;
  type: CourseType;
  dateTime: string;
  maxCapacity: number;
  currentEnrollment: number;
  difficulty: DifficultyLevel;
  materials: string[];
  description: string;
  averageRating: number;
  feedbackCount: number;
  color: string;
  isEnded: boolean;
}

export interface Feedback {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  enrolledAt: string;
  feedbackSubmitted: boolean;
  course?: Course;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'beginner',
    name: '新手手工艺人',
    description: '完成3门课程获得',
    icon: '🎨',
    color: '#4CAF50',
    requirement: 3,
  },
  {
    id: 'skilled',
    name: '熟手工匠',
    description: '完成5门课程获得',
    icon: '🏆',
    color: '#FF9800',
    requirement: 5,
  },
];

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  pottery: '陶艺',
  weaving: '编织',
  embroidery: '刺绣',
  woodcarving: '木雕',
  painting: '绘画',
  jewelry: '首饰',
};

export const CURRENT_USER_ID = 'user1';
