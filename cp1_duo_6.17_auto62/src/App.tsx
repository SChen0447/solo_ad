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

const generateHslColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 72 + Math.floor(Math.random() * 12);
  const lightness = 52 + Math.floor(Math.random() * 10);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hslStringToHex = (hsl: string): string => {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return '#3b82f6';
  return hslToHex(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
};

const generateAvatar = (name: string): string => {
  const initials = name.slice(0, 2).toUpperCase();
  const bgColor = hslStringToHex(generateHslColor());
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="20" fill="${bgColor}"/><text x="20" y="26" font-size="16" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">${initials}</text></svg>`
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
  const cardsRef = useRef<StoryCard[]>([]);
  const currentUserRef = useRef({
    ...DEFAULT_USER,
    color: generateHslColor(),
  });

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const addActivityLog = useCallback((log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const newLog: ActivityLog = {
      ...log,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    setActivityLogs((prev) => {
      const next = [newLog, ...prev];
      return next.slice(0, 5);
    });
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
          color: hslStringToHex(user.color.startsWith('hsl') ? user.color : generateHslColor()),
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
          color: hslStringToHex(user.color.startsWith('hsl') ? user.color : generateHslColor()),
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
        x?: number;
        y?: number;
        timestamp?: string;
      }) => {
        const isCurrentUser = data.userId === currentUserRef.current.userId;

        setCards((prev) => {
          const card = prev.find((c) => c.id === data.cardId);
          if (!card) return prev;

          const oldSwimlane = card.swimlaneId;
          const newCards = prev.filter((cc) => cc.id !== data.cardId);
          let newPos = data.position;

          if (oldSwimlane === data.swimlaneId) {
            const sameLane = newCards
              .filter((cc) => cc.swimlaneId === data.swimlaneId)
              .sort((a, b) => a.position - b.position);
            newPos = Math.min(Math.max(newPos, 0), sameLane.length);
            const updatedOthers = newCards.map((cc) => {
              if (cc.swimlaneId !== data.swimlaneId) return cc;
              const idx = sameLane.findIndex((s) => s.id === cc.id);
              if (idx >= newPos) {
                return { ...cc, position: idx + 1 };
              }
              return cc;
            });
            return [
              ...updatedOthers,
              {
                ...card,
                swimlaneId: data.swimlaneId,
                position: newPos,
                updatedAt: new Date().toISOString(),
              },
            ];
          } else {
            const oldLane = newCards
              .filter((cc) => cc.swimlaneId === oldSwimlane)
              .sort((a, b) => a.position - b.position);
            const newLane = newCards
              .filter((cc) => cc.swimlaneId === data.swimlaneId)
              .sort((a, b) => a.position - b.position);
            newPos = Math.min(Math.max(newPos, 0), newLane.length);

            const updatedOthers = newCards.map((cc) => {
              if (cc.swimlaneId === oldSwimlane) {
                const idx = oldLane.findIndex((s) => s.id === cc.id);
                return { ...cc, position: idx };
              }
              if (cc.swimlaneId === data.swimlaneId) {
                const idx = newLane.findIndex((s) => s.id === cc.id);
                if (idx >= newPos) {
                  return { ...cc, position: idx + 1 };
                }
              }
              return cc;
            });

            return [
              ...updatedOthers,
              {
                ...card,
                swimlaneId: data.swimlaneId,
                position: newPos,
                updatedAt: new Date().toISOString(),
              },
            ];
          }
        });

        const currentCards = cardsRef.current;
        const movedCard = currentCards.find((c) => c.id === data.cardId);

        if (!isCurrentUser) {
          addActivityLog({
            userId: data.userId,
            userName: data.userName,
            action: '移动了卡片',
            target: movedCard?.title || data.cardId,
            color: hslStringToHex(data.color.startsWith('hsl') ? data.color : (data.color || '#3b82f6')),
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
  }, [fetchInitialData, initializeMockData, addActivityLog]);

  const handleCardMove = useCallback((
    cardId: string,
    swimlaneId: string,
    position: number,
    newSwimlaneTitle?: string
  ) => {
    const user = currentUserRef.current;
    const movedCard = cards.find((c) => c.id === cardId);
    let actualSwimlaneId = swimlaneId;

    setCards((prev) => {
      const card = prev.find((c) => c.id === cardId);
      if (!card) return prev;

      const oldSwimlane = card.swimlaneId;
      let newSwimlaneId = swimlaneId;

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
        actualSwimlaneId = newLane.id;
        socketRef.current?.emit('swimlane_create', newLane);

        addActivityLog({
          userId: user.userId,
          userName: user.userName,
          action: '创建了泳道',
          target: newLane.title,
          color: hslStringToHex(user.color.startsWith('hsl') ? user.color : '#3b82f6'),
        });
      }

      const newCards = prev.filter((c) => c.id !== cardId);

      if (oldSwimlane === newSwimlaneId) {
        const sameLane = newCards
          .filter((c) => c.swimlaneId === newSwimlaneId)
          .sort((a, b) => a.position - b.position);
        const newPos = Math.min(Math.max(position, 0), sameLane.length);
        const result = [
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
        cardsRef.current = result;
        return result;
      } else {
        const oldLaneCards = newCards
          .filter((c) => c.swimlaneId === oldSwimlane)
          .sort((a, b) => a.position - b.position);
        const newLaneCards = newCards
          .filter((c) => c.swimlaneId === newSwimlaneId)
          .sort((a, b) => a.position - b.position);
        const newPos = Math.min(Math.max(position, 0), newLaneCards.length);

        const updatedOthers = newCards.map((c) => {
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

        const final = [
          ...updatedOthers,
          {
            ...card,
            swimlaneId: newSwimlaneId,
            position: newPos,
            updatedAt: new Date().toISOString(),
          },
        ];
        cardsRef.current = final;
        return final;
      }
    });

    addActivityLog({
      userId: user.userId,
      userName: user.userName,
      action: '移动了卡片',
      target: movedCard?.title || cardId,
      color: hslStringToHex(user.color.startsWith('hsl') ? user.color : '#3b82f6'),
    });

    socketRef.current?.emit('card_move', {
      cardId,
      swimlaneId: actualSwimlaneId,
      position,
      userId: user.userId,
      userName: user.userName,
      color: user.color,
      x: mousePosRef.current.x,
      y: mousePosRef.current.y,
      timestamp: new Date().toISOString(),
    });
  }, [swimlanes, cards, addActivityLog]);

  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleCursorMove = useCallback((x: number, y: number, draggingId: string | null) => {
    mousePosRef.current = { x, y };
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
      color: hslStringToHex(currentUserRef.current.color.startsWith('hsl') ? currentUserRef.current.color : '#3b82f6'),
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
