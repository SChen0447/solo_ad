import { useState, useEffect, useCallback, useRef } from 'react';
import EditorPanel from './components/EditorPanel';
import CommentPanel from './components/CommentPanel';
import DiffView from './components/DiffView';
import { mockSocket } from './utils/mockSocket';
import type { User, CursorPosition, Comment, Proposal, Snapshot, CodeFile, RoomState, Reply } from './types';
import './styles/app.css';

const App = () => {
  const [roomState, setRoomState] = useState<RoomState>({
    roomId: '',
    users: [],
    currentUser: null,
    files: {},
    currentFile: 'main.js',
    cursors: {},
    comments: [],
    proposals: [],
    snapshots: [],
    currentSnapshotIndex: -1,
    showDiffView: false,
    activeProposal: null,
  });
  const [commentPanelCollapsed, setCommentPanelCollapsed] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(true);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('demo-room');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [timelineValue, setTimelineValue] = useState(0);
  const snapshotIntervalRef = useRef<number | null>(null);
  const cursorDebounceRef = useRef<number | null>(null);
  const userEditingFilesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1280);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (!showJoinModal && Object.keys(roomState.files).length > 0) {
      snapshotIntervalRef.current = window.setInterval(() => {
        const snapshot: Snapshot = {
          timestamp: Date.now(),
          files: Object.fromEntries(
            Object.entries(roomState.files).map(([name, file]) => [name, file.content])
          ),
          currentFile: roomState.currentFile,
        };
        mockSocket.emit('snapshot-save', { snapshot });
      }, 10000);
    }
    return () => {
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
      }
    };
  }, [showJoinModal, roomState.files, roomState.currentFile]);

  useEffect(() => {
    const cleanupFns: (() => void)[] = [];

    cleanupFns.push(
      mockSocket.on('room-joined', (data: any) => {
        setRoomState((prev) => ({
          ...prev,
          roomId: data.roomId,
          users: data.users,
          currentUser: data.currentUser,
          files: data.files,
          currentFile: data.currentFile,
          comments: data.comments,
          proposals: data.proposals,
          snapshots: data.snapshots,
          currentSnapshotIndex: data.snapshots.length - 1,
        }));
        setTimelineValue(data.snapshots.length - 1);
      })
    );

    cleanupFns.push(
      mockSocket.on('user-joined', (users: User[]) => {
        setRoomState((prev) => ({ ...prev, users }));
      })
    );

    cleanupFns.push(
      mockSocket.on('cursors-updated', (cursors: Record<string, CursorPosition>) => {
        setRoomState((prev) => ({ ...prev, cursors }));
      })
    );

    cleanupFns.push(
      mockSocket.on('code-updated', (data: { fileName: string; content: string; language: string }) => {
        setIsTransitioning(true);
        setRoomState((prev) => {
          const updatedFiles = {
            ...prev.files,
            [data.fileName]: {
              ...prev.files[data.fileName],
              content: data.content,
              language: data.language as any,
            },
          };
          return { ...prev, files: updatedFiles };
        });
        setTimeout(() => setIsTransitioning(false), 300);
      })
    );

    cleanupFns.push(
      mockSocket.on('file-switched', (data: { userId: string; fileName: string }) => {
        userEditingFilesRef.current[data.userId] = data.fileName;
        setRoomState((prev) => ({ ...prev }));
      })
    );

    cleanupFns.push(
      mockSocket.on('comment-added', (comment: Comment) => {
        setRoomState((prev) => ({
          ...prev,
          comments: [comment, ...prev.comments],
        }));
      })
    );

    cleanupFns.push(
      mockSocket.on('comment-updated', (updatedComment: Comment) => {
        setRoomState((prev) => ({
          ...prev,
          comments: prev.comments.map((c) => (c.id === updatedComment.id ? updatedComment : c)),
        }));
      })
    );

    cleanupFns.push(
      mockSocket.on('proposal-created', (proposal: Proposal) => {
        setRoomState((prev) => ({
          ...prev,
          proposals: [proposal, ...prev.proposals],
          showDiffView: true,
          activeProposal: proposal,
        }));
      })
    );

    cleanupFns.push(
      mockSocket.on('proposal-updated', (updatedProposal: Proposal) => {
        setRoomState((prev) => ({
          ...prev,
          proposals: prev.proposals.map((p) =>
            p.id === updatedProposal.id ? updatedProposal : p
          ),
          activeProposal: prev.activeProposal?.id === updatedProposal.id ? updatedProposal : prev.activeProposal,
        }));
      })
    );

    cleanupFns.push(
      mockSocket.on('proposal-approved', (proposal: Proposal) => {
        const content = roomState.files[proposal.fileName]?.content || '';
        const lines = content.split('\n');
        const beforeLines = lines.slice(0, proposal.startLine - 1);
        const afterLines = lines.slice(proposal.endLine);
        const newContent = [...beforeLines, ...proposal.proposedCode.split('\n'), ...afterLines].join('\n');
        mockSocket.emit('code-change', {
          roomId: roomState.roomId,
          fileName: proposal.fileName,
          content: newContent,
          language: roomState.files[proposal.fileName]?.language || 'javascript',
        });
      })
    );

    cleanupFns.push(
      mockSocket.on('snapshots-updated', (snapshots: Snapshot[]) => {
        setRoomState((prev) => ({
          ...prev,
          snapshots,
          currentSnapshotIndex: snapshots.length - 1,
        }));
        setTimelineValue(snapshots.length - 1);
      })
    );

    cleanupFns.push(
      mockSocket.on('file-added', (file: CodeFile) => {
        setRoomState((prev) => ({
          ...prev,
          files: { ...prev.files, [file.name]: file },
        }));
      })
    );

    return () => cleanupFns.forEach((fn) => fn());
  }, [roomState.roomId, roomState.files]);

  const handleJoinRoom = useCallback(() => {
    if (!username.trim()) return;
    setShowJoinModal(false);
    mockSocket.emit('join-room', {
      roomId,
      user: {
        id: 'user-' + Math.random().toString(36).substr(2, 9),
        name: username.trim(),
        color: '#6366f1',
        avatar: username.trim().charAt(0).toUpperCase(),
      },
    });
  }, [username, roomId]);

  const handleCursorChange = useCallback(
    (cursor: CursorPosition) => {
      if (cursorDebounceRef.current) {
        clearTimeout(cursorDebounceRef.current);
      }
      cursorDebounceRef.current = window.setTimeout(() => {
        mockSocket.emit('cursor-update', {
          roomId: roomState.roomId,
          cursor,
        });
      }, 50);
    },
    [roomState.roomId]
  );

  const handleCodeChange = useCallback(
    (content: string, language: string) => {
      mockSocket.emit('code-change', {
        roomId: roomState.roomId,
        fileName: roomState.currentFile,
        content,
        language,
      });
    },
    [roomState.roomId, roomState.currentFile]
  );

  const handleSwitchFile = useCallback(
    (fileName: string) => {
      setRoomState((prev) => ({ ...prev, currentFile: fileName }));
      if (roomState.currentUser) {
        userEditingFilesRef.current[roomState.currentUser.id] = fileName;
        mockSocket.emit('switch-file', {
          roomId: roomState.roomId,
          fileName,
          userId: roomState.currentUser.id,
        });
      }
    },
    [roomState.roomId, roomState.currentUser]
  );

  const handleAddComment = useCallback(
    (lineNumber: number, content: string) => {
      if (!roomState.currentUser) return;
      mockSocket.emit('comment-add', {
        roomId: roomState.roomId,
        comment: {
          roomId: roomState.roomId,
          lineNumber,
          content,
          author: roomState.currentUser,
          resolved: false,
          replies: [],
          fileName: roomState.currentFile,
        },
      });
    },
    [roomState.roomId, roomState.currentFile, roomState.currentUser]
  );

  const handleResolveComment = useCallback(
    (commentId: string) => {
      if (!roomState.currentUser) return;
      mockSocket.emit('comment-resolve', {
        roomId: roomState.roomId,
        commentId,
        user: roomState.currentUser,
      });
    },
    [roomState.roomId, roomState.currentUser]
  );

  const handleAddReply = useCallback(
    (commentId: string, content: string) => {
      if (!roomState.currentUser) return;
      mockSocket.emit('comment-reply', {
        roomId: roomState.roomId,
        commentId,
        reply: {
          content,
          author: roomState.currentUser,
        } as Reply,
      });
    },
    [roomState.roomId, roomState.currentUser]
  );

  const handleCreateProposal = useCallback(
    (startLine: number, endLine: number, originalCode: string, proposedCode: string, description: string) => {
      if (!roomState.currentUser) return;
      mockSocket.emit('proposal-create', {
        roomId: roomState.roomId,
        proposal: {
          roomId: roomState.roomId,
          fileName: roomState.currentFile,
          startLine,
          endLine,
          originalCode,
          proposedCode,
          author: roomState.currentUser,
          description,
        },
      });
    },
    [roomState.roomId, roomState.currentFile, roomState.currentUser]
  );

  const handleLikeProposal = useCallback(
    (proposalId: string) => {
      if (!roomState.currentUser) return;
      mockSocket.emit('proposal-like', {
        roomId: roomState.roomId,
        proposalId,
        userId: roomState.currentUser.id,
      });
    },
    [roomState.roomId, roomState.currentUser]
  );

  const handleRejectProposal = useCallback(
    (proposalId: string) => {
      if (!roomState.currentUser) return;
      mockSocket.emit('proposal-reject', {
        roomId: roomState.roomId,
        proposalId,
        userId: roomState.currentUser.id,
      });
    },
    [roomState.roomId, roomState.currentUser]
  );

  const handleTimelineChange = useCallback((value: number) => {
    setTimelineValue(value);
  }, []);

  const handleTimelineCommit = useCallback(
    (value: number) => {
      mockSocket.emit('snapshot-restore', {
        roomId: roomState.roomId,
        snapshotIndex: value,
      });
      setRoomState((prev) => ({ ...prev, currentSnapshotIndex: value }));
    },
    [roomState.roomId]
  );

  const getLastCommentTime = () => {
    if (roomState.comments.length === 0) return null;
    const sorted = [...roomState.comments].sort((a, b) => b.createdAt - a.createdAt);
    return sorted[0].createdAt;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getUserEditingFile = (userId: string) => {
    return userEditingFilesRef.current[userId] || roomState.currentFile;
  };

  const currentFileObj = roomState.files[roomState.currentFile];
  const lastCommentTime = getLastCommentTime();

  if (showJoinModal) {
    return (
      <div className="join-modal-overlay">
        <div className="join-modal">
          <div className="join-modal-header">
            <div className="logo">
              <span className="logo-icon">⟨⟩</span>
              <span className="logo-text">CodeCollab</span>
            </div>
            <p className="join-subtitle">实时协作 · 高效审阅</p>
          </div>
          <div className="join-modal-body">
            <div className="form-group">
              <label>房间ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="输入房间ID或使用默认"
              />
            </div>
            <div className="form-group">
              <label>用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入您的用户名"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
            </div>
            <button className="join-btn" onClick={handleJoinRoom} disabled={!username.trim()}>
              进入协作房间
            </button>
            <div className="quick-rooms">
              <span>快速加入：</span>
              <button className="quick-room-btn" onClick={() => setRoomId('demo-room')}>Demo</button>
              <button className="quick-room-btn" onClick={() => setRoomId('team-alpha')}>Team Alpha</button>
              <button className="quick-room-btn" onClick={() => setRoomId('code-review')}>Code Review</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="logo small">
            <span className="logo-icon">⟨⟩</span>
            <span className="logo-text">CodeCollab</span>
          </div>
          <div className="room-info">
            <span className="room-id-badge">房间: {roomState.roomId}</span>
          </div>
        </div>
        <div className="header-center">
          <div className="file-tabs">
            {Object.values(roomState.files).map((file) => (
              <div
                key={file.name}
                className={`file-tab ${roomState.currentFile === file.name ? 'active' : ''}`}
                onClick={() => handleSwitchFile(file.name)}
              >
                <span className={`file-icon lang-${file.language}`}>
                  {file.language === 'javascript' ? 'JS' : file.language === 'typescript' ? 'TS' : 'PY'}
                </span>
                <span className="file-name">{file.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="header-right">
          <div className="user-avatars">
            {roomState.users.map((user) => (
              <div
                key={user.id}
                className="user-avatar"
                style={{ backgroundColor: user.color, borderColor: user.color }}
                title={`${user.name} - 正在编辑: ${getUserEditingFile(user.id)}`}
              >
                {user.avatar}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className={`main-content ${isSmallScreen ? 'small-screen' : ''}`}>
        <div className={`editor-section ${commentPanelCollapsed || isSmallScreen ? 'expanded' : ''}`}>
          {currentFileObj && (
            <EditorPanel
              file={currentFileObj}
              code={currentFileObj.content}
              language={currentFileObj.language}
              cursors={roomState.cursors}
              users={roomState.users}
              comments={roomState.comments.filter((c) => c.fileName === roomState.currentFile)}
              currentUser={roomState.currentUser}
              onCursorChange={handleCursorChange}
              onCodeChange={handleCodeChange}
              onAddComment={handleAddComment}
              onCreateProposal={handleCreateProposal}
              isTransitioning={isTransitioning}
              proposals={roomState.proposals.filter((p) => p.fileName === roomState.currentFile)}
              onOpenProposal={(proposal) =>
                setRoomState((prev) => ({ ...prev, showDiffView: true, activeProposal: proposal }))
              }
            />
          )}
        </div>

        <div className={`comment-section ${commentPanelCollapsed ? 'collapsed' : ''} ${isSmallScreen ? 'bottom-panel' : ''}`}>
          {!isSmallScreen && (
            <button
              className="collapse-toggle"
              onClick={() => setCommentPanelCollapsed(!commentPanelCollapsed)}
            >
              {commentPanelCollapsed ? '◀' : '▶'}
            </button>
          )}
          {!commentPanelCollapsed && (
            <CommentPanel
              comments={roomState.comments.filter((c) => c.fileName === roomState.currentFile)}
              currentUser={roomState.currentUser}
              onResolveComment={handleResolveComment}
              onAddReply={handleAddReply}
              onAddComment={handleAddComment}
              currentFileName={roomState.currentFile}
            />
          )}
        </div>
      </div>

      {roomState.showDiffView && roomState.activeProposal && (
        <DiffView
          proposal={roomState.activeProposal}
          users={roomState.users}
          currentUser={roomState.currentUser}
          onLike={handleLikeProposal}
          onReject={handleRejectProposal}
          onClose={() => setRoomState((prev) => ({ ...prev, showDiffView: false, activeProposal: null }))}
        />
      )}

      <footer className="status-bar">
        <div className="status-left">
          <span className="status-item">
            <span className="status-dot online"></span>
            在线: {roomState.users.length} 人
          </span>
          {roomState.users.slice(0, 3).map((user) => (
            <span key={user.id} className="status-user" style={{ borderLeftColor: user.color }}>
              <span className="status-avatar" style={{ backgroundColor: user.color }}>
                {user.avatar}
              </span>
              <span className="status-username">{user.name}</span>
              <span className="status-file">📄 {getUserEditingFile(user.id)}</span>
            </span>
          ))}
        </div>
        <div className="status-center">
          {showTimeline && roomState.snapshots.length > 0 && (
            <div className="timeline-container">
              <div className="timeline-label">
                <span className="timeline-icon">⏱</span>
                时光回溯: {roomState.snapshots.length} 个快照
              </div>
              <div className="timeline-slider-wrapper">
                <input
                  type="range"
                  min="0"
                  max={roomState.snapshots.length - 1}
                  value={timelineValue}
                  onChange={(e) => handleTimelineChange(parseInt(e.target.value))}
                  onMouseUp={(e) => handleTimelineCommit(parseInt((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => handleTimelineCommit(parseInt((e.target as HTMLInputElement).value))}
                  className="timeline-slider"
                  style={{
                    background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-purple) ${(timelineValue / Math.max(1, roomState.snapshots.length - 1)) * 100}%, var(--bg-hover) ${(timelineValue / Math.max(1, roomState.snapshots.length - 1)) * 100}%, var(--bg-hover) 100%)`,
                  }}
                />
                <div className="timeline-ticks">
                  {roomState.snapshots.map((_, idx) => (
                    <div
                      key={idx}
                      className={`timeline-tick ${idx === timelineValue ? 'active' : ''}`}
                      style={{ left: `${(idx / Math.max(1, roomState.snapshots.length - 1)) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="timeline-time">
                {roomState.snapshots[timelineValue] && formatTime(roomState.snapshots[timelineValue].timestamp)}
              </div>
              <button className="timeline-restore-btn" onClick={() => handleTimelineCommit(timelineValue)}>
                恢复此版本
              </button>
            </div>
          )}
        </div>
        <div className="status-right">
          <span className="status-item">
            💬 最后评论: {lastCommentTime ? formatTime(lastCommentTime) : '暂无'}
          </span>
          <span className="status-item">
            <span className={`lang-badge lang-${currentFileObj?.language}`}>
              {currentFileObj?.language.toUpperCase() || 'JS'}
            </span>
          </span>
          <button
            className="timeline-toggle-btn"
            onClick={() => setShowTimeline(!showTimeline)}
            title={showTimeline ? '隐藏时间轴' : '显示时间轴'}
          >
            {showTimeline ? '⌄' : '⌃'} 时间轴
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
