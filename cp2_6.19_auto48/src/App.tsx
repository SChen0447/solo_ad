import React, { useState, useEffect, useRef, useCallback } from 'react';
import { roomManager } from './modules/room/RoomManager';
import { eventBus } from './utils/EventEmitter';
import { defaultTheme } from './config/themes';
import WordCloudCanvas, { WordCloudCanvasRef } from './components/WordCloudCanvas';
import TeacherPanel from './components/TeacherPanel';
import JoinPage from './components/JoinPage';
import CreateRoomPage from './components/CreateRoomPage';
import WordInput from './components/WordInput';
import type { Theme, Role } from './types';

const App: React.FC = () => {
  const [role, setRole] = useState<Role>(null);
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [onlineCount, setOnlineCount] = useState(1);
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [words, setWords] = useState<Map<string, number>>(new Map());
  const [isExporting, setIsExporting] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [showJoinPage, setShowJoinPage] = useState(false);

  const wordcloudRef = useRef<WordCloudCanvasRef>(null);

  useEffect(() => {
    const handleWordAdded = () => {
      const currentWords = roomManager.getWords();
      setWords(new Map(currentWords));
    };

    const handleRoomCleared = () => {
      setWords(new Map());
    };

    const handleMemberJoined = () => {
      const members = roomManager.getMembers();
      setOnlineCount(members.length);
    };

    const handleMemberLeft = () => {
      const members = roomManager.getMembers();
      setOnlineCount(members.length);
    };

    eventBus.on('word:added', handleWordAdded);
    eventBus.on('room:cleared', handleRoomCleared);
    eventBus.on('member:joined', handleMemberJoined);
    eventBus.on('member:left', handleMemberLeft);

    return () => {
      eventBus.off('word:added', handleWordAdded);
      eventBus.off('room:cleared', handleRoomCleared);
      eventBus.off('member:joined', handleMemberJoined);
      eventBus.off('member:left', handleMemberLeft);
    };
  }, []);

  const handleTeacherSelect = () => {
    setRole('teacher');
    setShowCreatePage(true);
  };

  const handleStudentSelect = () => {
    setRole('student');
    setShowJoinPage(true);
  };

  const handleCreateRoom = (roomName: string, nickname: string) => {
    const { roomId: newRoomId } = roomManager.createRoom(roomName, nickname);
    setRoomId(newRoomId);
    setIsInRoom(true);
    setShowCreatePage(false);
    setWords(new Map());
    setOnlineCount(1);
  };

  const handleJoinRoom = (roomIdInput: string, nickname: string): boolean => {
    const result = roomManager.joinRoom(roomIdInput, nickname);
    if (result.success) {
      setRoomId(roomIdInput);
      setIsInRoom(true);
      setShowJoinPage(false);
      setJoinError('');
      const currentWords = roomManager.getWords();
      setWords(new Map(currentWords));
      const members = roomManager.getMembers();
      setOnlineCount(members.length);
      return true;
    } else {
      setJoinError(result.message);
      return false;
    }
  };

  const handleBack = () => {
    setShowCreatePage(false);
    setShowJoinPage(false);
    setRole(null);
    setJoinError('');
  };

  const handleWordSubmit = (word: string, inputElement: HTMLInputElement) => {
    const success = roomManager.addWord(word);
    if (success && wordcloudRef.current) {
      const rect = inputElement.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top;
      wordcloudRef.current.addRocketAnimation(startX, startY);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleClear = useCallback(() => {
    if (wordcloudRef.current) {
      wordcloudRef.current.clearWithAnimation();
    }
    roomManager.clearRoom();
  }, []);

  const handleExport = useCallback(() => {
    setIsExporting(true);
    setTimeout(() => {
      if (wordcloudRef.current) {
        const dataUrl = wordcloudRef.current.exportPNG();
        const link = document.createElement('a');
        link.download = `wordcloud-${roomId}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
      setIsExporting(false);
    }, 500);
  }, [roomId]);

  const handleLeaveRoom = () => {
    roomManager.leaveRoom();
    setIsInRoom(false);
    setRoomId('');
    setWords(new Map());
    setOnlineCount(0);
    setRole(null);
    setShowCreatePage(false);
    setShowJoinPage(false);
  };

  if (!role) {
    return (
      <div className="app-container">
        <div className="role-selector">
          <div className="role-card" onClick={handleTeacherSelect}>
            <div className="role-icon">👨‍🏫</div>
            <div className="role-title">我是教师</div>
          </div>
          <div className="role-card" onClick={handleStudentSelect}>
            <div className="role-icon">👩‍🎓</div>
            <div className="role-title">我是学生</div>
          </div>
        </div>
      </div>
    );
  }

  if (showCreatePage && role === 'teacher') {
    return (
      <div className="app-container">
        <CreateRoomPage
          onCreate={handleCreateRoom}
          onBack={handleBack}
          theme={theme}
        />
      </div>
    );
  }

  if (showJoinPage && role === 'student') {
    return (
      <div className="app-container">
        <JoinPage
          onJoin={handleJoinRoom}
          onBack={handleBack}
          error={joinError}
        />
      </div>
    );
  }

  if (!isInRoom) {
    return null;
  }

  return (
    <div
      className="app-container"
      style={{ '--primary-color': theme.primaryColor } as React.CSSProperties}
    >
      <div className="main-layout">
        <div className="wordcloud-section">
          <WordCloudCanvas
            ref={wordcloudRef}
            words={words}
            theme={theme}
          />
          {role === 'student' && (
            <WordInput
              onSubmit={handleWordSubmit}
              theme={theme}
            />
          )}
        </div>

        {role === 'teacher' && (
          <TeacherPanel
            roomId={roomId}
            onlineCount={onlineCount}
            theme={theme}
            onThemeChange={handleThemeChange}
            onClear={handleClear}
            onExport={handleExport}
            isExporting={isExporting}
          />
        )}

        {role === 'student' && (
          <div
            className="control-panel"
            style={{ backgroundColor: theme.panelBgColor, color: theme.textColor }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="online-count">
                <span>房间号：</span>
                <span style={{ fontWeight: 'bold', letterSpacing: '2px' }}>{roomId}</span>
              </div>
            </div>
            <div className="online-count">
              <span>在线人数：</span>
              <span className="online-number">{onlineCount}</span>
              <span>人</span>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={handleLeaveRoom}
              >
                离开房间
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
