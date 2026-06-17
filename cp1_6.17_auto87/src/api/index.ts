import axios from 'axios';
import { Submission, Comment, StudentInfo, ScoreRangeData, HistoryPoint } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const submitCode = async (code: string, studentId: string = 'stu_001'): Promise<Submission> => {
  const res = await api.post<Submission>('/submit', { code, student_id: studentId });
  return res.data;
};

export const getStats = async (): Promise<{
  chart_data: ScoreRangeData[];
  students: StudentInfo[];
  total_submissions: number;
}> => {
  const res = await api.get('/stats');
  return res.data;
};

export const getHistory = async (studentId: string, limit: number = 6): Promise<{
  student_id: string;
  student_name: string;
  history: Submission[];
  chart_data: HistoryPoint[];
}> => {
  const res = await api.get(`/history/${studentId}`, { params: { limit } });
  return res.data;
};

export const getSubmission = async (submissionId: string): Promise<{
  submission: Submission;
  comments: Comment[];
}> => {
  const res = await api.get(`/submission/${submissionId}`);
  return res.data;
};

export const addComment = async (
  submissionId: string,
  content: string,
  author: string = '教师'
): Promise<Comment> => {
  const res = await api.post<Comment>('/comment', { submission_id: submissionId, author, content });
  return res.data;
};

export const getUnreadCount = async (studentId: string): Promise<number> => {
  const res = await api.get(`/unread/${studentId}`);
  return res.data.unread_count;
};

export const clearUnread = async (studentId: string): Promise<void> => {
  await api.post(`/unread/${studentId}`);
};
