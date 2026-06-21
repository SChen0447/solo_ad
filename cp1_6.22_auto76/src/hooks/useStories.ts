import { useState, useCallback } from 'react';
import type { StorySummary, StoryDetail, Chapter, CreateStoryRequest, AddChapterRequest, UpdateChapterStatusRequest } from '../types';

interface UseStoriesReturn {
  stories: StorySummary[];
  storyDetail: StoryDetail | null;
  loading: boolean;
  error: string | null;
  fetchStories: () => Promise<void>;
  fetchStoryDetail: (id: string) => Promise<void>;
  createStory: (data: CreateStoryRequest) => Promise<StoryDetail | null>;
  addChapter: (storyId: string, data: AddChapterRequest) => Promise<Chapter | null>;
  updateChapterStatus: (storyId: string, chapterId: string, status: 'approved' | 'rejected') => Promise<Chapter | null>;
  confirmContinue: (storyId: string) => Promise<boolean>;
}

export function useStories(): UseStoriesReturn {
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [storyDetail, setStoryDetail] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = useCallback(async <T>(requestFn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestFn();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '请求失败';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStories = useCallback(async (): Promise<void> => {
    const result = await handleRequest(async () => {
      const response = await fetch('/api/stories');
      if (!response.ok) {
        throw new Error('获取故事列表失败');
      }
      return response.json() as Promise<StorySummary[]>;
    });
    if (result) {
      setStories(result);
    }
  }, [handleRequest]);

  const fetchStoryDetail = useCallback(async (id: string): Promise<void> => {
    const result = await handleRequest(async () => {
      const response = await fetch(`/api/stories/${id}`);
      if (!response.ok) {
        throw new Error('获取故事详情失败');
      }
      return response.json() as Promise<StoryDetail>;
    });
    if (result) {
      setStoryDetail(result);
    }
  }, [handleRequest]);

  const createStory = useCallback(async (data: CreateStoryRequest): Promise<StoryDetail | null> => {
    const result = await handleRequest(async () => {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('创建故事失败');
      }
      return response.json() as Promise<StoryDetail>;
    });
    if (result) {
      setStories(prev => [...prev, {
        id: result.id,
        title: result.title,
        description: result.description,
        chapterCount: result.chapters.length,
      }]);
    }
    return result;
  }, [handleRequest]);

  const addChapter = useCallback(async (storyId: string, data: AddChapterRequest): Promise<Chapter | null> => {
    const result = await handleRequest(async () => {
      const response = await fetch(`/api/stories/${storyId}/chapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('添加章节失败');
      }
      return response.json() as Promise<Chapter>;
    });
    if (result && storyDetail) {
      setStoryDetail({
        ...storyDetail,
        chapters: [...storyDetail.chapters, result],
      });
      setStories(prev => prev.map(s => 
        s.id === storyId 
          ? { ...s, chapterCount: s.chapterCount + 1 }
          : s
      ));
    }
    return result;
  }, [handleRequest, storyDetail]);

  const updateChapterStatus = useCallback(async (
    storyId: string, 
    chapterId: string, 
    status: 'approved' | 'rejected'
  ): Promise<Chapter | null> => {
    const requestData: UpdateChapterStatusRequest = { status };
    const result = await handleRequest(async () => {
      const response = await fetch(`/api/stories/${storyId}/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      if (!response.ok) {
        throw new Error('更新章节状态失败');
      }
      return response.json() as Promise<Chapter>;
    });
    if (result && storyDetail) {
      setStoryDetail({
        ...storyDetail,
        chapters: storyDetail.chapters.map(c =>
          c.id === chapterId ? { ...c, status } : c
        ),
      });
    }
    return result;
  }, [handleRequest, storyDetail]);

  const confirmContinue = useCallback(async (storyId: string): Promise<boolean> => {
    const result = await handleRequest(async () => {
      const response = await fetch(`/api/stories/${storyId}`);
      if (!response.ok) {
        throw new Error('确认失败');
      }
      return response.json() as Promise<StoryDetail>;
    });
    return result !== null;
  }, [handleRequest]);

  return {
    stories,
    storyDetail,
    loading,
    error,
    fetchStories,
    fetchStoryDetail,
    createStory,
    addChapter,
    updateChapterStatus,
    confirmContinue,
  };
}
