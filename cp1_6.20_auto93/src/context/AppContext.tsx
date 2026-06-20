import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Topic, Idea, UserVotes, VotePayload } from '@/types';

interface AppContextType {
  userId: string;
  userName: string;
  setUserName: (name: string) => void;
  topics: Topic[];
  currentTopic: Topic | null;
  ideas: Idea[];
  userVotes: UserVotes;
  loading: boolean;
  socket: Socket | null;
  fetchTopics: () => Promise<void>;
  createTopic: (title: string, description: string) => Promise<Topic | null>;
  selectTopic: (topicId: string) => Promise<void>;
  setDeadline: (topicId: string, deadline: string | null) => Promise<void>;
  endVoting: (topicId: string) => Promise<void>;
  createIdea: (topicId: string, title: string, description: string) => Promise<Idea | null>;
  voteIdea: (topicId: string, ideaId: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | null>(null);

const generateUserId = (): string => {
  const existing = localStorage.getItem('idea_canvas_user_id');
  if (existing) return existing;
  const id = 'u_' + Math.random().toString(36).substring(2, 11);
  localStorage.setItem('idea_canvas_user_id', id);
  return id;
};

const getStoredName = (): string => {
  return localStorage.getItem('idea_canvas_user_name') || '匿名用户';
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId] = useState<string>(generateUserId());
  const [userName, setUserNameState] = useState<string>(getStoredName());
  const [topics, setTopics] = useState<Topic[]>([]);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [userVotes, setUserVotes] = useState<UserVotes>({
    voted_ids: [],
    remaining_votes: 3,
    max_votes: 3,
  });
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const currentTopicIdRef = useRef<string | null>(null);

  const setUserName = useCallback((name: string) => {
    setUserNameState(name);
    localStorage.setItem('idea_canvas_user_name', name);
  }, []);

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const setupTopicListeners = useCallback((topicId: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.off(`topic:${topicId}:idea:created`);
    socket.off(`topic:${topicId}:idea:voted`);
    socket.off(`topic:${topicId}:updated`);
    socket.off(`topic:${topicId}:voting_ended`);

    socket.on(`topic:${topicId}:idea:created`, (idea: Idea) => {
      setIdeas((prev) => {
        if (prev.find((i) => i.id === idea.id)) return prev;
        return [...prev, { ...idea, _remote: true } as Idea & { _remote?: boolean }];
      });
    });

    socket.on(`topic:${topicId}:idea:voted`, (payload: VotePayload) => {
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === payload.idea_id ? { ...i, votes: payload.votes } : i
        )
      );
      if (payload.user_id === userId) {
        setUserVotes((prev) => ({
          ...prev,
          voted_ids: prev.voted_ids.includes(payload.idea_id)
            ? prev.voted_ids
            : [...prev.voted_ids, payload.idea_id],
          remaining_votes: payload.remaining_votes,
        }));
      }
    });

    socket.on(`topic:${topicId}:updated`, (topic: Topic) => {
      setCurrentTopic(topic);
      setTopics((prev) => prev.map((t) => (t.id === topic.id ? topic : t)));
    });

    socket.on(`topic:${topicId}:voting_ended`, (topic: Topic) => {
      setCurrentTopic(topic);
      setTopics((prev) => prev.map((t) => (t.id === topic.id ? topic : t)));
    });
  }, [userId]);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/topics');
      setTopics(res.data);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTopic = useCallback(
    async (title: string, description: string): Promise<Topic | null> => {
      setLoading(true);
      try {
        const res = await axios.post('/api/topics', {
          title,
          description,
          creator_id: userId,
        });
        const topic: Topic = res.data;
        setTopics((prev) => [...prev, topic]);
        return topic;
      } catch (err) {
        console.error('Failed to create topic:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const selectTopic = useCallback(
    async (topicId: string) => {
      setLoading(true);
      currentTopicIdRef.current = topicId;
      try {
        const [topicRes, ideasRes, votesRes] = await Promise.all([
          axios.get(`/api/topics/${topicId}`),
          axios.get(`/api/topics/${topicId}/ideas`),
          axios.get(`/api/topics/${topicId}/user-votes`, {
            params: { user_id: userId },
          }),
        ]);

        const topic: Topic = topicRes.data;
        setCurrentTopic(topic);
        setIdeas(ideasRes.data);
        setUserVotes(votesRes.data);
        setupTopicListeners(topicId);
      } catch (err) {
        console.error('Failed to select topic:', err);
      } finally {
        setLoading(false);
      }
    },
    [userId, setupTopicListeners]
  );

  const setDeadline = useCallback(
    async (topicId: string, deadline: string | null) => {
      try {
        await axios.put(`/api/topics/${topicId}/deadline`, {
          deadline,
          user_id: userId,
        });
      } catch (err) {
        console.error('Failed to set deadline:', err);
        throw err;
      }
    },
    [userId]
  );

  const endVoting = useCallback(
    async (topicId: string) => {
      try {
        await axios.post(`/api/topics/${topicId}/end`, { user_id: userId });
      } catch (err) {
        console.error('Failed to end voting:', err);
        throw err;
      }
    },
    [userId]
  );

  const createIdea = useCallback(
    async (topicId: string, title: string, description: string): Promise<Idea | null> => {
      try {
        const res = await axios.post(`/api/topics/${topicId}/ideas`, {
          title,
          description,
          author_id: userId,
          author_name: userName,
          author_avatar: '',
        });
        return res.data;
      } catch (err) {
        console.error('Failed to create idea:', err);
        return null;
      }
    },
    [userId, userName]
  );

  const voteIdea = useCallback(
    async (topicId: string, ideaId: string): Promise<boolean> => {
      try {
        await axios.post(`/api/topics/${topicId}/ideas/${ideaId}/vote`, {
          user_id: userId,
        });
        return true;
      } catch (err) {
        console.error('Failed to vote:', err);
        return false;
      }
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      userId,
      userName,
      setUserName,
      topics,
      currentTopic,
      ideas,
      userVotes,
      loading,
      socket: socketRef.current,
      fetchTopics,
      createTopic,
      selectTopic,
      setDeadline,
      endVoting,
      createIdea,
      voteIdea,
    }),
    [
      userId,
      userName,
      setUserName,
      topics,
      currentTopic,
      ideas,
      userVotes,
      loading,
      fetchTopics,
      createTopic,
      selectTopic,
      setDeadline,
      endVoting,
      createIdea,
      voteIdea,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
