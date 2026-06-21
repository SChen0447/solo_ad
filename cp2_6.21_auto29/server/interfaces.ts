export interface Course {
  id: string;
  title: string;
  coverImage: string;
  description: string;
  instructor: string;
  instructorAvatar: string;
  startDate: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: number;
  title: string;
  description: string;
  assignment?: AssignmentRequirement;
}

export interface AssignmentRequirement {
  id: string;
  description: string;
  attachments?: Attachment[];
  dueDate?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  lessonId: number;
  lessonTitle: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  description: string;
  content: string;
  attachments: Attachment[];
  submittedAt: string;
  status: 'pending' | 'graded';
  feedback?: string;
  score?: number;
  gradedAt?: string;
}

export interface Notification {
  id: string;
  type: 'new_assignment' | 'graded' | 'course_change';
  title: string;
  content: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AssignmentSubmitInput {
  courseId: string;
  lessonId: number;
  lessonTitle: string;
  content: string;
  attachments: Attachment[];
}

export interface GradeInput {
  feedback: string;
  score: number;
}
