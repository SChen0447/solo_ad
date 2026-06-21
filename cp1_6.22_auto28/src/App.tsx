import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { StickyNote as StickyNoteType, Connection, Board, OnlineUser, MACARON_COLORS } from './types';
import BoardComponent from './Board';
import VotePanel from './VotePanel';
import './App.css';

const getUserId = (): string => {
  let userId = localStorage.getItem('brainstorm_user_id');
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('brainstorm_user_id', userId);
  }
  return userId;
};

const getUserName = (): string => {
  let userName = localStorage.getItem('brainstorm_user_name');
  if (!userName) {
    userName = `匿名用户#${Math.floor(Math.random() * 9000 + 1000)}`;
    localStorage.setItem('brainstorm_user_name', userName);
  }
  return userName;
};

const getVotedStickyIds = (): Set<string> => {
  const voted = localStorage.getItem('brainstorm_voted_stickies');
  if (voted) {
    try {
      return new Set(JSON.parse(voted));
    } catch {
      return new Set();
    }
  }
  return new Set();
};

const saveVotedStickyIds = (ids: Set<string>) => {
  localStorage.setItem('brainstorm_voted_stickies', JSON.stringify([...ids]));
};

function App() {
  const [stickies, setStickies] = useState<StickyNoteType[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [userId] = useState<string>(getUserId());
  const [userName, setUserName] = useState<string>(getUserName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [votedStickyIds, setVotedStickyIds] = useState<Set<string>>(getVotedStickyIds());
  const [selectedStickyId, setSelectedStickyId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const socketRef = useRef<Socket | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await fetch('/api/board');
        const data = await response.json();
        setBoard(data.board);
        setStickies(data.stickies);
        setConnections(data.connections);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch board:', error);
        setIsLoading(false);
      }
    };
    fetchBoard();
  }, []);

  useEffect(() => {
    const socket = io({
      query: {
        userId,
        userName,
      },
    });
    socketRef.current = socket;

    socket.on('usersUpdate', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    socket.on('stickyCreated', (sticky: StickyNoteType) => {
      setStickies(prev => {
        if (prev.find(s => s.id === sticky.id)) return prev;
        return [...prev, sticky];
      });
    });

    socket.on('stickyMoved', ({ id, x, y }: { id: string; x: number; y: number }) => {
      setStickies(prev =>
        prev.map(s => (s.id === id ? { ...s, x, y } : s))
      );
    });

    socket.on('stickyUpdated', (sticky: StickyNoteType) => {
      setStickies(prev =>
        prev.map(s => (s.id === sticky.id ? sticky : s))
      );
    });

    socket.on('stickyDeleted', ({ id }: { id: string }) => {
      setStickies(prev => prev.filter(s => s.id !== id));
      setConnections(prev =>
        prev.filter(c => c.from_sticky_id !== id && c.to_sticky_id !== id)
      );
    });

    socket.on('voteUpdated', ({ stickyId, votes, userId: voteUserId, voted }: 
      { stickyId: string; votes: number; userId: string; voted: boolean }) => {
      setStickies(prev =>
        prev.map(s => (s.id === stickyId ? { ...s, votes } : s))
      );
      
      if (voteUserId === userId) {
        setVotedStickyIds(prev => {
          const newSet = new Set(prev);
          if (voted) {
            newSet.add(stickyId);
          } else {
            newSet.delete(stickyId);
          }
          saveVotedStickyIds(newSet);
          return newSet;
        });
      }
    });

    socket.on('connectionCreated', (connection: Connection) => {
      setConnections(prev => {
        if (prev.find(c => c.id === connection.id)) return prev;
        return [...prev, connection];
      });
    });

    socket.on('connectionDeleted', ({ id }: { id: string }) => {
      setConnections(prev => prev.filter(c => c.id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, userName]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameChange = () => {
    const trimmedName = editName.trim();
    if (trimmedName.length >= 2 && trimmedName.length <= 8) {
      setUserName(trimmedName);
      localStorage.setItem('brainstorm_user_name', trimmedName);
      socketRef.current?.emit('updateUserName', { userId, name: trimmedName });
    } else {
      setEditName(userName);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameChange();
    } else if (e.key === 'Escape') {
      setEditName(userName);
      setIsEditingName(false);
    }
  };

  const handleCreateSticky = useCallback(async (x: number, y: number, content: string) => {
    if (!board) return;
    
    const randomColor = MACARON_COLORS[Math.floor(Math.random() * MACARON_COLORS.length)];
    
    try {
      const response = await fetch(`/api/board/${board.id}/sticky`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content || '',
          color: randomColor,
          x: Math.round(x),
          y: Math.round(y),
        }),
      });
      const sticky = await response.json();
      setStickies(prev => [...prev, sticky]);
    } catch (error) {
      console.error('Failed to create sticky:', error);
    }
  }, [board]);

  const handleUpdateStickyPosition = useCallback((id: string, x: number, y: number) => {
    setStickies(prev =>
      prev.map(s => (s.id === id ? { ...s, x, y } : s))
    );
    
    fetch(`/api/sticky/${id}/position`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y }),
    });
  }, []);

  const handleUpdateStickyContent = useCallback((id: string, content: string) => {
    setStickies(prev =>
      prev.map(s => (s.id === id ? { ...s, content } : s))
    );
    
    fetch(`/api/sticky/${id}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  }, []);

  const handleUpdateStickyColor = useCallback((id: string, color: string) => {
    setStickies(prev =>
      prev.map(s => (s.id === id ? { ...s, color } : s))
    );
    
    fetch(`/api/sticky/${id}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color }),
    });
  }, []);

  const handleDeleteSticky = useCallback((id: string) => {
    fetch(`/api/sticky/${id}`, {
      method: 'DELETE',
    });
    setStickies(prev => prev.filter(s => s.id !== id));
    setConnections(prev =>
      prev.filter(c => c.from_sticky_id !== id && c.to_sticky_id !== id)
    );
    if (selectedStickyId === id) {
      setSelectedStickyId(null);
    }
  }, [selectedStickyId]);

  const handleVoteSticky = useCallback((id: string) => {
    fetch(`/api/sticky/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  }, [userId]);

  const handleCreateConnection = useCallback(async (fromId: string, toId: string) => {
    if (!board) return;
    
    try {
      const response = await fetch(`/api/board/${board.id}/connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStickyId: fromId,
          toStickyId: toId,
        }),
      });
      const connection = await response.json();
      setConnections(prev => {
        if (prev.find(c => c.id === connection.id)) return prev;
        return [...prev, connection];
      });
    } catch (error) {
      console.error('Failed to create connection:', error);
    }
  }, [board]);

  const handleDeleteConnection = useCallback((id: string) => {
    fetch(`/api/connection/${id}`, {
      method: 'DELETE',
    });
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  const displayedUsers = onlineUsers.slice(0, 6);
  const extraUsersCount = onlineUsers.length - 6;

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="user-section">
          <div className="user-avatar" title={onlineUsers.length > 0 ? 'online' : ''}>
            {userName.charAt(0).toUpperCase()}
          </div>
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameChange}
              onKeyDown={handleNameKeyDown}
              className="name-input"
              maxLength={8}
            />
          ) : (
            <span
              className="user-name"
              onClick={() => {
                setEditName(userName);
                setIsEditingName(true);
              }}
              title="点击修改昵称"
            >
              {userName}
            </span>
          )}
          <span className="online-indicator">
            <span className="status-dot" />
            {onlineUsers.length} 人在线
          </span>
        </div>

        <div className="title-section">
          <h1 className="app-title">头脑风暴白板</h1>
        </div>

        <div className="online-users-section">
          <div className="online-avatars">
            {displayedUsers.map((user, index) => (
              <div
                key={user.id}
                className="mini-avatar"
                style={{ zIndex: displayedUsers.length - index }}
                title={user.name}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {extraUsersCount > 0 && (
              <div className="mini-avatar more-extra" style={{ zIndex: 0 }}>
                +{extraUsersCount}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="app-body">
        <div className="board-wrapper">
          <BoardComponent
            stickies={stickies}
            connections={connections}
            votedStickyIds={votedStickyIds}
            selectedStickyId={selectedStickyId}
            selectedConnectionId={selectedConnectionId}
            onSelectSticky={setSelectedStickyId}
            onSelectConnection={setSelectedConnectionId}
            onCreateSticky={handleCreateSticky}
            onUpdateStickyPosition={handleUpdateStickyPosition}
            onUpdateStickyContent={handleUpdateStickyContent}
            onUpdateStickyColor={handleUpdateStickyColor}
            onDeleteSticky={handleDeleteSticky}
            onVoteSticky={handleVoteSticky}
            onCreateConnection={handleCreateConnection}
            onDeleteConnection={handleDeleteConnection}
          />
        </div>

        {!isMobile && (
          <VotePanel
            stickies={stickies}
            votedStickyIds={votedStickyIds}
            onVoteSticky={handleVoteSticky}
            boardId={board?.id || ''}
          />
        )}
      </div>

      {isMobile && (
        <VotePanel
          stickies={stickies}
          votedStickyIds={votedStickyIds}
          onVoteSticky={handleVoteSticky}
          boardId={board?.id || ''}
          isMobile={true}
          isExpanded={isPanelExpanded}
          onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
        />
      )}
    </div>
  );
}

export default App;
