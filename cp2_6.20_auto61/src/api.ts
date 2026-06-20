import type { Course, Feedback, Enrollment } from './types';

const API_BASE = '/api';

export async function fetchCourses(): Promise<Course[]> {
  const response = await fetch(`${API_BASE}/courses`);
  const data = await response.json();
  return data.courses;
}

export async function fetchCourse(id: string): Promise<Course> {
  const response = await fetch(`${API_BASE}/courses/${id}`);
  const data = await response.json();
  return data.course;
}

export async function signUp(courseId: string, userId: string): Promise<Enrollment> {
  const response = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ courseId, userId }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '报名失败');
  }
  
  return data.enrollment;
}

export async function cancelSignUp(courseId: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ courseId, userId }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '取消报名失败');
  }
}

export async function fetchEnrollments(userId: string): Promise<Enrollment[]> {
  const response = await fetch(`${API_BASE}/enrollments?userId=${userId}`);
  const data = await response.json();
  return data.enrollments;
}

export async function submitFeedback(
  courseId: string,
  userId: string,
  rating: number,
  comment: string
): Promise<Feedback> {
  const response = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ courseId, userId, rating, comment }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '提交反馈失败');
  }
  
  return data.feedback;
}

export async function fetchFeedback(courseId: string): Promise<Feedback[]> {
  const response = await fetch(`${API_BASE}/feedback/${courseId}`);
  const data = await response.json();
  return data.feedback;
}
