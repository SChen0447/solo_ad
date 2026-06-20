export interface Course {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  capacity: number;
  enrolled: number;
  difficulty: string;
  description: string;
  materials: string[];
  instructor: string;
  location: string;
  price: number;
  endTime: string;
  avgRating: number;
  feedbackCount: number;
  remaining: number;
  isEnrolled?: boolean;
}

export interface Feedback {
  id: number;
  courseId: number;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  userName: string;
}

export interface Enrollment {
  id: number;
  courseId: number;
  userId: string;
  enrolledAt: string;
  course: Course;
  hasFeedback: boolean;
  courseEnded: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface UserEnrollments {
  enrollments: Enrollment[];
  badges: Badge[];
  completedCount: number;
  totalEnrolled: number;
}

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }
  return response.json();
}

export function fetchCourses(): Promise<Course[]> {
  return request<Course[]>('/courses');
}

export function fetchCourse(id: number): Promise<Course> {
  return request<Course>(`/courses/${id}`);
}

export function fetchFeedbacks(courseId: number): Promise<Feedback[]> {
  return request<Feedback[]>(`/courses/${courseId}/feedbacks`);
}

export function signUp(courseId: number): Promise<{ success: boolean; enrolled: number; remaining: number }> {
  return request<{ success: boolean; enrolled: number; remaining: number }>(`/courses/${courseId}/signup`, {
    method: 'POST'
  });
}

export function cancelSignUp(courseId: number): Promise<{ success: boolean; enrolled: number; remaining: number }> {
  return request<{ success: boolean; enrolled: number; remaining: number }>(`/courses/${courseId}/cancel`, {
    method: 'POST'
  });
}

export function submitFeedback(
  courseId: number,
  rating: number,
  comment: string
): Promise<{ success: boolean; feedback: Feedback }> {
  return request<{ success: boolean; feedback: Feedback }>(`/courses/${courseId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment })
  });
}

export function fetchUserEnrollments(): Promise<UserEnrollments> {
  return request<UserEnrollments>('/user/enrollments');
}

export const TYPE_COLORS: Record<string, string> = {
  '陶艺': '#D2691E',
  '编织': '#6B8E23',
  '木工': '#8B4513',
  '刺绣': '#C71585',
  '皮具': '#A0522D',
  '烘焙': '#CD853F'
};

export function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || '#D2691E';
}
