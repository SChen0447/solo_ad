import { useState, useCallback } from 'react';
import axios from 'axios';
import type {
  Homework,
  Feedback,
  Stats,
  CreateFeedbackPayload,
  UpdateFeedbackPayload,
} from '../types';

const API_BASE = '/api';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function useFeedback() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchHomeworks = useCallback(async (role: 'teacher' | 'student', userId: string): Promise<Homework[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<Homework[]>(`${API_BASE}/homework`, {
        params: { role, userId },
      });
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取作业列表失败';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHomeworkDetail = useCallback(async (homeworkId: string): Promise<Homework> => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<Homework>(`${API_BASE}/homework/${homeworkId}`);
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取作业详情失败';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (teacherId: string): Promise<Stats> => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<Stats>(`${API_BASE}/homework/stats`, {
        params: { teacherId },
      });
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取统计数据失败';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createFeedback = useCallback(async (payload: CreateFeedbackPayload): Promise<Feedback> => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post<Feedback>(`${API_BASE}/feedback`, {
        ...payload,
        id: generateId(),
      });
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提交批注失败';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFeedback = useCallback(async (payload: UpdateFeedbackPayload): Promise<Feedback> => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.put<Feedback>(`${API_BASE}/feedback/${payload.id}`, payload);
      return res.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '更新批注失败';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFeedback = useCallback(async (feedbackId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_BASE}/feedback/${feedbackId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除批注失败';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    clearError,
    fetchHomeworks,
    fetchHomeworkDetail,
    fetchStats,
    createFeedback,
    updateFeedback,
    deleteFeedback,
  };
}
