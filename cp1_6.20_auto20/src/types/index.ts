export type TeacherColor = 'A' | 'B';

export interface Teacher {
  id: string;
  name: string;
  color: TeacherColor;
}

export interface Feedback {
  id: string;
  homeworkId: string;
  teacherId: string;
  teacherName: string;
  teacherColor: TeacherColor;
  startIndex: number;
  endIndex: number;
  selectedText: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface Homework {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  content: string;
  submittedAt: string;
  feedbacks: Feedback[];
}

export interface Stats {
  totalHomework: number;
  gradedHomework: number;
  avgCommentLength: number;
}

export interface CreateFeedbackPayload {
  homeworkId: string;
  teacherId: string;
  teacherName: string;
  teacherColor: TeacherColor;
  startIndex: number;
  endIndex: number;
  selectedText: string;
  comment: string;
}

export interface UpdateFeedbackPayload {
  id: string;
  comment: string;
}
