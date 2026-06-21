export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface AssignmentRequirement {
  id: string;
  description: string;
  attachments: Attachment[];
  deadline?: string;
}

export interface Lesson {
  id: string;
  title: string;
  order: number;
  assignment?: AssignmentRequirement;
}

export interface Course {
  id: string;
  title: string;
  coverImage: string;
  description: string;
  startTime: string;
  totalLessons: number;
  instructorName: string;
  instructorAvatar: string;
  progress: number;
  lessons: Lesson[];
}

export interface Assignment {
  id: string;
  courseId: string;
  lessonId: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  content: string;
  attachments: Attachment[];
  submittedAt: string;
  status: 'pending' | 'graded';
  feedback?: string;
  rating?: number;
  gradedAt?: string;
  courseTitle?: string;
  lessonTitle?: string;
}

export type NotificationType = 'new_assignment' | 'graded' | 'schedule_change';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  icon: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
