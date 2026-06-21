import type { Course, Assignment, Notification, GradeInput, AssignmentSubmitInput } from '../types';

const BASE_URL = '/api';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }
  return response.json();
};

export const api = {
  getCourses: (): Promise<Course[]> =>
    fetch(`${BASE_URL}/courses`).then(res => handleResponse<Course[]>(res)),

  getCourseById: (id: string): Promise<Course> =>
    fetch(`${BASE_URL}/courses/${id}`).then(res => handleResponse<Course>(res)),

  getAssignments: (): Promise<Assignment[]> =>
    fetch(`${BASE_URL}/assignments`).then(res => handleResponse<Assignment[]>(res)),

  getAssignmentById: (id: string): Promise<Assignment> =>
    fetch(`${BASE_URL}/assignments/${id}`).then(res => handleResponse<Assignment>(res)),

  submitAssignment: (data: AssignmentSubmitInput): Promise<Assignment> =>
    fetch(`${BASE_URL}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => handleResponse<Assignment>(res)),

  gradeAssignment: (id: string, data: GradeInput): Promise<Assignment> =>
    fetch(`${BASE_URL}/assignments/${id}/grade`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => handleResponse<Assignment>(res)),

  getNotifications: (): Promise<Notification[]> =>
    fetch(`${BASE_URL}/notifications`).then(res => handleResponse<Notification[]>(res)),

  markNotificationRead: (id: string): Promise<Notification> =>
    fetch(`${BASE_URL}/notifications/${id}/read`, {
      method: 'PUT'
    }).then(res => handleResponse<Notification>(res)),

  markAllNotificationsRead: (): Promise<{ success: boolean }> =>
    fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PUT'
    }).then(res => handleResponse<{ success: boolean }>(res)),

  getUnreadCount: (): Promise<{ count: number }> =>
    fetch(`${BASE_URL}/notifications/unread-count`).then(res => handleResponse<{ count: number }>(res))
};
