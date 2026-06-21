const BASE_URL = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.message || '请求失败');
  }
  return json.data as T;
}

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

export interface CourseListItem extends Omit<Course, 'lessons'> {}

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

export const api = {
  getCourses: () => request<CourseListItem[]>('/courses'),

  getCourse: (id: string) => request<Course>(`/courses/${id}`),

  createCourse: (data: Partial<Course>) =>
    request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCourseAssignments: (courseId: string) =>
    request<Assignment[]>(`/courses/${courseId}/assignments`),

  getAssignments: (params?: { status?: string; courseId?: string; sort?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.courseId) query.set('courseId', params.courseId);
    if (params?.sort) query.set('sort', params.sort);
    const qs = query.toString();
    return request<Assignment[]>(`/assignments${qs ? `?${qs}` : ''}`);
  },

  getAssignment: (id: string) => request<Assignment>(`/assignments/${id}`),

  submitAssignment: (data: {
    courseId: string;
    lessonId: string;
    content: string;
    attachments: Attachment[];
  }) =>
    request<Assignment>('/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  gradeAssignment: (id: string, feedback: string, rating: number) =>
    request<Assignment>(`/assignments/${id}/grade`, {
      method: 'PUT',
      body: JSON.stringify({ feedback, rating }),
    }),

  getNotifications: (userId?: string) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request<Notification[]>(`/notifications${qs}`);
  },

  markNotificationsRead: (userId?: string, notificationId?: string) =>
    request<null>('/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ userId, notificationId }),
    }),
};
