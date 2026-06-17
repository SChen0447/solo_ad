import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import CanvasBoard from './CanvasBoard';
import CollaborationPanel from './CollaborationPanel';
import type {
  StoryCard,
  SwimLane,
  Collaborator,
  ActivityLog,
  UserCursor,
  StoryType,
} from './types';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

const USER_COLORS = [
  '#f97316', '#8b5cf6', '#ec4899', '#06b6d4',
  '#f59e0b', '#6366f1', '#10b981', '#ef4444',
];

const generateAvatar = (name: string): string => {
  const initials = name.slice(0, 2).toUpperCase();
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="#${Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')}"/><text x="20" y="26" font-size="16" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">${initials}</text></svg>`
  )}`;
};

const DEFAULT_USER = {
  userId: uuidv4(),
  userName: `用户${Math.floor(Math.random() * 1000)}`,
};

function App() {
  const [swimlanes, setSwimlanes] = useState<SwimLane[]>([]);
  const [cards, setCards] = useState<StoryCard[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, UserCursor>>({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const currentUserRef = useRef({
    ...DEFAULT_USER,
    color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
  });

  const addActivityLog = useCallback((log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const newLog: ActivityLog = {
      ...log,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => [newLog, ...prev].slice(0, 5));
  }, []);

  const initializeMockData = useCallback(() => {
    const mockSwimlanes: SwimLane[] = [
      {
        id: uuidv4(),
        title: '第一周冲刺',
        position: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: '第二周冲刺',
        position: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: '第三周冲刺',
        position: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const types: StoryType[] = ['feature', 'technical', 'bug'];
    const titles = [
      '用户登录功能', '数据导出Excel', '首页性能优化',
      '修复支付异常', '消息通知系统', 'API文档完善',
      '搜索功能增强', '移动端适配', '数据库索引优化',
    ];

    const mockCards: StoryCard[] = [];
    for (let i = 0; i < 9; i++) {
      const laneIdx = i % 3;
      mockCards.push({
        id: uuidv4(),
        title: titles[i],
        description: `这是一个关于${titles[i]}的详细描述，包含了该故事的验收标准和实现要点。`,
        type: types[i % 3],
        storyPoints: Math.floor(Math.random() * 13) + 1,
        swimlaneId: mockSwimlanes[laneIdx].id,
        position: Math.floor(i / 3),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUserRef.current.userId,
      });
    }

    setSwimlanes(mockSwimlanes);
    setCards(mockCards);
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const [lanesRes, cardsRes] = await Promise.all([
        axios.get(`${API_BASE}/swimlanes`),
        axios.get(`${API_BASE}/cards`),
      ]);
      setSwimlanes(lanesRes.data);
      setCards(cardsRes.data);
    } catch {
      initializeMockData();
    }
  }, [initializeMockData]);

  useEffect(() => {
    fetchInitialData();

    try {
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
        const user = currentUserRef.current;
        socket.emit('user_connected', {
          userId: user.userId,
          userName: user.userName,
          color: user.color,
        });

        setCollaborators((prev) => {
          const exists = prev.find((c) => c.userId === user.userId);
          if (exists) return prev;
          return [
            ...prev,
            {
              userId: user.userId,
              userName: user.userName,
              avatar: generateAvatar(user.userName),
              color: user.color,
              isOnline: true,
            },
          ];
        });
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
      });

      socket.on('users_list', (users: Collaborator[]) => {
        setCollaborators(users);
      });

      socket.on('user_joined', (user: Collaborator) => {
        setCollaborators((prev) => {
          if (prev.find((c) => c.userId === user.userId)) return prev;
          return [...prev, { ...user, isOnline: true }];
        });
        addActivityLog({
          userId: user.userId,
          userName: user.userName,
          action: '加入了协作',
          target: '',
          color: user.color,
        });
      });

      socket.on('user_left', (user: { userId: string; userName: string; color: string }) => {
        setCollaborators((prev) =>
          prev.map((c) =>
            c.userId === user.userId ? { ...c, isOnline: false } : c
          )
        );
        setRemoteCursors((prev) => {
          const next = { ...prev };
          delete next[user.userId];
          return next;
        });
        addActivityLog({
          userId: user.userId,
          userName: user.userName,
          action: '离开了协作',
          target: '',
          color: user.color,
        });
      });

      socket.on('cursor_move', (cursor: UserCursor) => {
        if (cursor.userId === currentUserRef.current.userId) return;
        setRemoteCursors((prev) => ({ ...prev, [cursor.userId]: cursor }));
      });

      socket.on('card_moved', (data: {
        cardId: string;
        swimlaneId: string;
        position: number;
        userId: string;
        userName: string;
        color: string;
      }) => {
        setCards((prev) =>
          prev.map((c) => {
            if (c.id !== data.cardId) return c;
            const oldSwimlane = c.swimlaneId;
            const newCards = prev.filter((cc) => cc.id !== data.cardId);
            let newPos = data.position;
            if (oldSwimlane === data.swimlaneId) {
              const sameLane = newCards
                .filter((cc) => cc.swimlaneId === data.swimlaneId)
                .sort((a, b) => a.position - b.position);
              newPos = Math.min(Math.max(newPos, 0), sameLane.length);
              sameLane.forEach((cc, idx) => {
                if (idx >= newPos && cc.id !== data.cardId) {
                  cc.position = idx + 1;
                }
              });
            } else {
              const oldLane = newCards
                .filter((cc) => cc.swimlaneId === oldSwimlane)
                .sort((a, b) => a.position - b.position);
              oldLane.forEach((cc, idx) => {
                cc.position = idx;
              });
              const newLane = newCards
                .filter((cc) => cc.swimlaneId === data.swimlaneId)
                .sort((a, b) => a.position - b.position);
              newPos = Math.min(Math.max(newPos, 0), newLane.length);
              newLane.forEach((cc, idx) => {
                if (idx >= newPos) {
                  cc.position = idx + 1;
                }
              });
            }
            return {
              ...c,
              swimlaneId: data.swimlaneId,
              position: newPos,
              updatedAt: new Date().toISOString(),
            };
          })
        );
        if (data.userId !== currentUserRef.current.userId) {
          const movedCard = cards.find((c) => c.id === data.cardId);
          addActivityLog({
            userId: data.userId,
            userName: data.userName,
            action: '移动了卡片',
            target: movedCard?.title || data.cardId,
            color: data.color,
          });
        }
      });

      socket.on('swimlane_created', (lane: SwimLane) => {
        setSwimlanes((prev) => [...prev, lane]);
        addActivityLog({
          userId: currentUserRef.current.userId,
          userName: '系统',
          action: '创建了泳道',
          target: lane.title,
          color: '#6b7280',
        });
      });

      socket.on('card_created', (card: StoryCard) => {
        setCards((prev) => [...prev, card]);
      });

      socket.on('card_updated', (card: StoryCard) => {
        setCards((prev) =>
          prev.map((c) => (c.id === card.id ? card : c))
        );
      });

      socket.on('card_deleted', (cardId: string) => {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
      });
    } catch (error) {
      initializeMockData();
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [fetchInitialData, initializeMockData, addActivityLog, cards]);

  const handleCardMove = useCallback((
    cardId: string,
    swimlaneId: string,
    position: number,
    newSwimlaneTitle?: string
  ) => {
    const user = currentUserRef.current;

    setCards((prev) => {
      const card = prev.find((c) => c.id === cardId);
      if (!card) return prev;

      const oldSwimlane = card.swimlaneId;
      let newSwimlaneId = swimlaneId;
      let targetLanes = swimlanes;

      if (newSwimlaneTitle && !swimlanes.find((l) => l.id === swimlaneId)) {
        const newLane: SwimLane = {
          id: uuidv4(),
          title: newSwimlaneTitle,
          position: swimlanes.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setSwimlanes((prevLanes) => [...prevLanes, newLane]);
        newSwimlaneId = newLane.id;
        targetLanes = [...swimlanes, newLane];
        socketRef.current?.emit('swimlane_create', newLane);
      }

      const newCards = prev.filter((c) => c.id !== cardId);

      if (oldSwimlane === newSwimlaneId) {
        const sameLane = newCards
          .filter((c) => c.swimlaneId === newSwimlaneId)
          .sort((a, b) => a.position - b.position);
        const newPos = Math.min(Math.max(position, 0), sameLane.length);
        return [
          ...newCards.map((c) => {
            if (c.swimlaneId !== newSwimlaneId) return c;
            const idx = sameLane.findIndex((s) => s.id === c.id);
            if (idx >= newPos) {
              return { ...c, position: idx + 1 };
            }
            return c;
          }),
          {
            ...card,
            swimlaneId: newSwimlaneId,
            position: newPos,
            updatedAt: new Date().toISOString(),
          },
        ];
      } else {
        const oldLaneCards = newCards
          .filter((c) => c.swimlaneId === oldSwimlane)
          .sort((a, b) => a.position - b.position);
        const newLaneCards = newCards
          .filter((c) => c.swimlaneId === newSwimlaneId)
          .sort((a, b) => a.position - b.position);
        const newPos = Math.min(Math.max(position, 0), newLaneCards.length);

        const result = newCards.map((c) => {
          if (c.swimlaneId === oldSwimlane) {
            const idx = oldLaneCards.findIndex((s) => s.id === c.id);
            return { ...c, position: idx };
          }
          if (c.swimlaneId === newSwimlaneId) {
            const idx = newLaneCards.findIndex((s) => s.id === c.id);
            if (idx >= newPos) {
              return { ...c, position: idx + 1 };
            }
          }
          return c;
        });

        return [
          ...result,
          {
            ...card,
            swimlaneId: newSwimlaneId,
            position: newPos,
            updatedAt: new Date().toISOString(),
          },
        ];
      }
    });

    socketRef.current?.emit('card_move', {
      cardId,
      swimlaneId,
      position,
      userId: user.userId,
      userName: user.userName,
      color: user.color,
    });
  }, [swimlanes]);

  const handleCursorMove = useCallback((x: number, y: number, draggingId: string | null) => {
    const user = currentUserRef.current;
    socketRef.current?.emit('cursor_move', {
      userId: user.userId,
      userName: user.userName,
      color: user.color,
      x,
      y,
      draggingCardId: draggingId,
    });
  }, []);

  const handleAddCard = useCallback((swimlaneId: string) => {
    const types: StoryType[] = ['feature', 'technical', 'bug'];
    const laneCards = cards.filter((c) => c.swimlaneId === swimlaneId);
    const newCard: StoryCard = {
      id: uuidv4(),
      title: '新故事卡片',
      description: '点击编辑故事描述',
      type: types[Math.floor(Math.random() * types.length)],
      storyPoints: 3,
      swimlaneId,
      position: laneCards.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUserRef.current.userId,
    };
    setCards((prev) => [...prev, newCard]);
    socketRef.current?.emit('card_create', newCard);
    addActivityLog({
      userId: currentUserRef.current.userId,
      userName: currentUserRef.current.userName,
      action: '创建了卡片',
      target: newCard.title,
      color: currentUserRef.current.color,
    });
  }, [cards, addActivityLog]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
      }}>
        <span style={{ fontSize: 20 }}>📋</span>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#1f2937' }}>用户故事地图</span>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: socketConnected ? '#22c55e' : '#ef4444',
          animation: socketConnected ? 'pulse 2s infinite' : 'none',
        }} />
        <span style={{ fontSize: 12, color: socketConnected ? '#22c55e' : '#ef4444' }}>
          {socketConnected ? '已连接' : '离线'}
        </span>
      </div>

      <CanvasBoard
        swimlanes={swimlanes}
        cards={cards}
        remoteCursors={remoteCursors}
        currentUserId={currentUserRef.current.userId}
        onCardMove={handleCardMove}
        onCursorMove={handleCursorMove}
        onDraggingChange={setDraggingCardId}
        onAddCard={handleAddCard}
      />

      <CollaborationPanel
        collaborators={collaborators}
        activityLogs={activityLogs}
        remoteCursors={remoteCursors}
        currentUserId={currentUserRef.current.userId}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default App;
