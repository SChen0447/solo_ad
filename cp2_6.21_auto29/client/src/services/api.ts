import type { Course, Assignment, Notification, GradeInput, AssignmentSubmitInput, Attachment } from '../types';

const BASE_URL = '/api';

const getErrorMessage = (status: number, errorData?: { error?: string }): string => {
  const errorMessages: Record<number, string> = {
    400: errorData?.error || '请求参数错误，请检查输入内容',
    401: '未授权，请重新登录',
    403: '无权限访问该资源',
    404: '请求的资源不存在',
    408: '请求超时，请检查网络连接',
    413: '文件过大，请压缩后重试',
    500: '服务器内部错误，请稍后重试',
    502: '网关错误，请稍后重试',
    503: '服务不可用，请稍后重试',
    504: '网关超时，请稍后重试'
  };
  return errorMessages[status] || errorData?.error || `请求失败 (${status})`;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  let errorData: { error?: string } | undefined;
  
  try {
    errorData = await response.json();
  } catch {
    errorData = { error: '网络错误' };
  }

  if (!response.ok) {
    const errorMessage = getErrorMessage(response.status, errorData);
    const error = new Error(errorMessage);
    error.name = 'ApiError';
    throw error;
  }

  return errorData as T;
};

export const api = {
  getCourses: async (): Promise<Course[]> => {
    try {
      const res = await fetch(`${BASE_URL}/courses`);
      return handleResponse<Course[]>(res);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  },

  getCourseById: async (id: string): Promise<Course> => {
    try {
      const res = await fetch(`${BASE_URL}/courses/${id}`);
      return handleResponse<Course>(res);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  },

  getAssignments: async (): Promise<Assignment[]> => {
    try {
      const res = await fetch(`${BASE_URL}/assignments`);
      return handleResponse<Assignment[]>(res);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  },

  getAssignmentById: async (id: string): Promise<Assignment> => {
    try {
      const res = await fetch(`${BASE_URL}/assignments/${id}`);
      return handleResponse<Assignment>(res);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  },

  submitAssignment: async (data: AssignmentSubmitInput): Promise<Assignment> => {
    try {
      const res = await fetch(`${BASE_URL}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse<Assignment>(res);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  },

  submitAssignmentWithFiles: async (data: {
    courseId: string;
    lessonId: number;
    lessonTitle: string;
    content: string;
    attachments: Attachment[];
    onProgress?: (progress: number) => void;
  }): Promise<Assignment> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append('lessonId', String(data.lessonId));
      formData.append('lessonTitle', data.lessonTitle);
      formData.append('content', data.content);

      data.attachments.forEach((att, index) => {
        if (att.url.startsWith('blob:')) {
          fetch(att.url)
            .then(res => res.blob())
            .then(blob => {
              formData.append(`files`, blob, att.name);
            });
        }
      });

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && data.onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          data.onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('服务器响应解析失败'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || getErrorMessage(xhr.status, error)));
          } catch (e) {
            reject(new Error(getErrorMessage(xhr.status)));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('网络连接失败，请检查网络设置'));
      });

      xhr.open('POST', `${BASE_URL}/assignments/${data.courseId}/submit`);
      
      setTimeout(() => {
        xhr.send(formData);
      }, 100);
    });
  },

  gradeAssignment: async (id: string, data: GradeInput): Promise<Assignment> => {
    try {
      const res = await fetch(`${BASE_URL}/assignments/${id}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse<Assignment>(res);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  },

  getNotifications: async (): Promise<Notification[]> => {
    try {
      const res = await fetch(`${BASE_URL}/notifications`);
      return handleResponse<Notification[]>(res);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  },

  markNotificationRead: async (id: string): Promise<Notification> => {
    try {
      const res = await fetch(`${BASE_URL}/notifications/${id}/read`, {
        method: 'PUT'
      });
      return handleResponse<Notification>(res);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  },

  markAllNotificationsRead: async (): Promise<{ success: boolean }> => {
    try {
      const res = await fetch(`${BASE_URL}/notifications/read-all`, {
        method: 'PUT'
      });
      return handleResponse<{ success: boolean }>(res);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    try {
      const res = await fetch(`${BASE_URL}/notifications/unread-count`);
      return handleResponse<{ count: number }>(res);
    } catch (error) {
      if (error instanceof Error && error.name === 'ApiError') {
        throw error;
      }
      throw new Error('网络连接失败，请检查网络设置');
    }
  }
};
