import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Team, ChatMessage, User } from '../types';

const Room: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentNickname, setCurrentNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showNotification = useCallback((msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchTeamData = async () => {
      try {
        const response = await fetch(`/api/teams/${id}`);
        if (!response.ok) {
          navigate('/');
          return;
        }
        const data = await response.json();
        setTeam(data.team);
        setMessages(data.messages);
      } catch (error) {
        console.error('获取小队信息失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamData();

    const socket: Socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', { teamId: id });
    });

    socket.on('joined', ({ userId, nickname, team: joinedTeam }: { userId: string; nickname: string; team: Team }) => {
      setCurrentUserId(userId);
      setCurrentNickname(nickname);
      setTeam(joinedTeam);
      setTimeout(scrollToBottom, 100);
    });

    socket.on('receive-message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user-joined', ({ members }: { user: User; members: User[] }) => {
      setTeam(prev => prev ? { ...prev, members } : prev);
    });

    socket.on('user-left', ({ members }: { userId: string; members: User[] }) => {
      setTeam(prev => prev ? { ...prev, members } : prev);
    });

    socket.on('team-disbanded', () => {
      showNotification('小队已解散，即将返回首页');
      setTimeout(() => navigate('/'), 2000);
    });

    socket.on('error', (err: { message: string }) => {
      showNotification(err.message);
      setTimeout(() => navigate('/'), 1500);
    });

    return () => {
      socket.emit('leave-room');
      socket.disconnect();
    };
  }, [id, navigate, scrollToBottom, showNotification]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current || !id) return;

    socketRef.current.emit('send-message', {
      teamId: id,
      text: inputText.trim()
    });
    setInputText('');
  };

  const handleLeave = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
    }
    navigate('/');
  };

  const handleDisband = () => {
    if (socketRef.current && confirm('确定要解散这个小队吗？所有成员将被移出。')) {
      socketRef.current.emit('disband-team');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="room-container">
        <div className="loading-room">
          <div className="skeleton-pulse" style={{ height: '80px', marginBottom: '20px' }}></div>
          <div className="room-body skeleton-pulse" style={{ height: '400px' }}></div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="room-container">
        <div className="empty-state">
          <h2>小队不存在</h2>
          <Link to="/" className="btn btn-primary">返回首页</Link>
        </div>
      </div>
    );
  }

  const isCreator = team.creatorId === currentUserId;

  return (
    <div className="room-container">
      {showToast && (
        <div className="toast">{toastMessage}</div>
      )}

      <header className="room-header">
        <div className="room-header-left">
          <button onClick={handleLeave} className="back-btn" title="离开小队">
            ←
          </button>
          <div className="room-info">
            <h2 className="room-title">{team.name}</h2>
            <div className="room-tags">
              {team.tags.map((tag, i) => (
                <span key={i} className="tag">#{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="room-header-right">
          <div className="online-badge">
            <span className="online-dot"></span>
            <span>在线 {team.members.length}/{team.maxMembers}</span>
          </div>
          {isCreator && (
            <button onClick={handleDisband} className="btn btn-danger">
              解散小队
            </button>
          )}
          {!isCreator && (
            <button onClick={handleLeave} className="btn btn-secondary">
              离开小队
            </button>
          )}
        </div>
      </header>

      <div className="room-body">
        <aside className="members-sidebar">
          <h3 className="sidebar-title">成员列表</h3>
          <div className="members-list">
            {team.members.map((member) => (
              <div key={member.id} className="member-item">
                <div className="avatar avatar-sm">
                  {member.nickname.charAt(0)}
                </div>
                <span className="member-name">
                  {member.nickname}
                  {member.id === team.creatorId && (
                    <span className="creator-badge">队长</span>
                  )}
                  {member.id === currentUserId && (
                    <span className="self-badge">我</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </aside>

        <main className="chat-area">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="no-messages">
                <p>还没有消息，发送第一条消息打招呼吧！👋</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.userId === currentUserId ? 'message-self' : ''}`}
                >
                  <div className="message-avatar">
                    {msg.nickname.charAt(0)}
                  </div>
                  <div className="message-content">
                    <div className="message-meta">
                      <span className="message-sender">{msg.nickname}</span>
                      <span className="message-time">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="message-text">{msg.text}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chat-input"
              placeholder={`以 ${currentNickname || '匿名'} 的身份发送消息...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary btn-send"
              disabled={!inputText.trim()}
            >
              发送
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default Room;
