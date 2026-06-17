import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import StoryTree from './components/StoryTree';
import EditorPanel from './components/EditorPanel';
import RoomHeader from './components/RoomHeader';
import { RoomData, StoryNodeData, ParticipantData, ActivityData } from './types';

type View = 'home' | 'create' | 'join' | 'room';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [room, setRoom] = useState<RoomData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string>('');
  const [newActivities, setNewActivities] = useState<ActivityData[]>([]);

  const createFormRef = useRef({
    theme: '',
    initialText: '',
    branchOptions: [
      { title: '', description: '' },
      { title: '', description: '' },
      { title: '', description: '' }
    ]
  });

  const joinFormRef = useRef({
    roomCode: '',
    name: ''
  });

  useEffect(() => {
    const newSocket = io({
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });
    setSocket(newSocket);
    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('node_added', (data: {
      node: StoryNodeData;
      parent_id: string;
      branch_option_id: string;
      room_is_completed: boolean;
    }) => {
      setRoom(prev => {
        if (!prev) return prev;
        const newNodes = { ...prev.nodes };
        newNodes[data.node.id] = data.node;

        if (newNodes[data.parent_id]) {
          const parent = { ...newNodes[data.parent_id] };
          parent.branch_options = parent.branch_options.map(opt => {
            if (opt.id === data.branch_option_id) {
              return { ...opt, child_node_id: data.node.id };
            }
            return opt;
          });
          newNodes[data.parent_id] = parent;
        }

        const newActivity: ActivityData = {
          node_id: data.node.id,
          author: data.node.author,
          avatar: data.node.avatar,
          summary: data.node.text.length > 60 ? data.node.text.slice(0, 60) + '...' : data.node.text,
          timestamp: data.node.timestamp
        };

        return {
          ...prev,
          nodes: newNodes,
          is_completed: data.room_is_completed,
          activities: [...prev.activities, newActivity]
        };
      });

      setNewActivities(prev => {
        const act = {
          node_id: data.node.id,
          author: data.node.author,
          avatar: data.node.avatar,
          summary: data.node.text.length > 60 ? data.node.text.slice(0, 60) + '...' : data.node.text,
          timestamp: data.node.timestamp
        };
        return [...prev, act];
      });
    });

    socket.on('participant_joined', (data: { participant: ParticipantData }) => {
      setRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: {
            ...prev.participants,
            [data.participant.id]: data.participant
          }
        };
      });
    });

    socket.on('participant_left', (data: { participant_id: string }) => {
      setRoom(prev => {
        if (!prev) return prev;
        const newParticipants = { ...prev.participants };
        delete newParticipants[data.participant_id];
        return { ...prev, participants: newParticipants };
      });
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.off('node_added');
      socket.off('participant_joined');
      socket.off('participant_left');
      socket.off('error');
    };
  }, [socket]);

  const handleCreateRoom = async () => {
    const form = createFormRef.current;
    const validOptions = form.branchOptions.filter(o => o.title.trim() && o.description.trim());

    if (form.initialText.length < 50) {
      setError('初始故事段落至少需要50字');
      return;
    }
    if (validOptions.length < 1 || validOptions.length > 5) {
      setError('请提供1-5个有效的分支选项');
      return;
    }
    if (!userName.trim()) {
      setError('请输入您的昵称');
      return;
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: form.theme || '未命名主题',
          initial_text: form.initialText,
          branch_options: validOptions,
          creator_name: userName.trim(),
          creator_avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(userName.trim())}`
        })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setRoom(data.room);
      setParticipantId(data.creator_id);
      setSelectedNodeId(data.room.root_node_id);
      setView('room');

      if (socket) {
        socket.emit('join_room', {
          room_code: data.room_code,
          participant_id: data.creator_id
        });
      }
    } catch {
      setError('创建房间失败，请重试');
    }
  };

  const handleJoinRoom = async () => {
    const form = joinFormRef.current;
    if (!form.roomCode.trim()) {
      setError('请输入房间码');
      return;
    }
    if (!form.name.trim()) {
      setError('请输入您的昵称');
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${form.roomCode.trim()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(form.name.trim())}`
        })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setRoom(data.room);
      setParticipantId(data.participant_id);
      setUserName(form.name.trim());
      setSelectedNodeId(data.room.root_node_id);
      setView('room');

      if (socket) {
        socket.emit('join_room', {
          room_code: form.roomCode.trim(),
          participant_id: data.participant_id
        });
      }
    } catch {
      setError('加入房间失败，请重试');
    }
  };

  const handleSubmitNode = useCallback((parentId: string, branchOptionId: string, text: string, branchOptions: { title: string; description: string }[]) => {
    if (!socket || !room || !participantId) return;

    socket.emit('submit_node', {
      room_code: room.room_code,
      participant_id: participantId,
      parent_id: parentId,
      branch_option_id: branchOptionId,
      text: text,
      branch_options: branchOptions
    });
  }, [socket, room, participantId]);

  if (view === 'home') {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)'
      }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 8, color: '#E0E0E0', letterSpacing: 2 }}>
          协作故事接龙
        </h1>
        <p style={{ fontSize: 16, color: '#B0B0B0', marginBottom: 48 }}>
          多人共创，分支叙事，一起编织无限可能
        </p>

        <div style={{
          display: 'flex', gap: 16, marginBottom: 24
        }}>
          <input
            type="text"
            placeholder="输入您的昵称..."
            value={userName}
            onChange={e => setUserName(e.target.value)}
            style={{
              width: 280, padding: '12px 16px',
              borderRadius: 8, border: '1px solid #6C63FF',
              background: 'rgba(108, 99, 255, 0.1)',
              color: '#E0E0E0', fontSize: 14, outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={() => setView('create')}
            style={buttonStyle}
            onMouseEnter={e => (e.currentTarget.style.background = '#7B73FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#6C63FF')}
          >
            创建故事房间
          </button>
          <button
            onClick={() => setView('join')}
            style={{
              ...buttonStyle,
              background: 'transparent',
              border: '1px solid #6C63FF',
              color: '#6C63FF'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(108, 99, 255, 0.1)';
              e.currentTarget.style.color = '#8B83FF';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6C63FF';
            }}
          >
            加入已有房间
          </button>
        </div>

        {error && <p style={{ color: '#FF6B6B', marginTop: 24 }}>{error}</p>}
      </div>
    );
  }

  if (view === 'create') {
    const form = createFormRef.current;
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 40, overflowY: 'auto',
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)'
      }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          <button
            onClick={() => setView('home')}
            style={{
              background: 'transparent', border: 'none', color: '#B0B0B0',
              cursor: 'pointer', fontSize: 14, marginBottom: 24, padding: 0
            }}
          >
            ← 返回首页
          </button>

          <h2 style={{ fontSize: 28, color: '#E0E0E0', marginBottom: 24 }}>创建故事房间</h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#B0B0B0', marginBottom: 8, fontSize: 14 }}>
              故事主题
            </label>
            <input
              type="text"
              placeholder="例如：星际冒险"
              value={form.theme}
              onChange={e => { form.theme = e.target.value; }}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#B0B0B0', marginBottom: 8, fontSize: 14 }}>
              初始故事段落（至少50字）
            </label>
            <textarea
              placeholder="写下故事的开头..."
              value={form.initialText}
              onChange={e => { form.initialText = e.target.value; }}
              style={{
                ...inputStyle, minHeight: 120, resize: 'vertical',
                fontFamily: 'inherit', lineHeight: 1.6
              }}
            />
            <div style={{ textAlign: 'right', fontSize: 12, color: form.initialText.length >= 50 ? '#6BCB77' : '#B0B0B0', marginTop: 4 }}>
              {form.initialText.length}/50 字
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#B0B0B0', marginBottom: 12, fontSize: 14 }}>
              分支选项（1-5个，每个包含标题和描述）
            </label>
            {form.branchOptions.map((opt, idx) => (
              <div key={idx} style={{
                background: 'rgba(108, 99, 255, 0.05)',
                border: '1px solid rgba(108, 99, 255, 0.2)',
                borderRadius: 8, padding: 16, marginBottom: 12
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{
                    background: '#6C63FF', color: '#fff', borderRadius: '50%',
                    width: 24, height: 24, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, fontWeight: 600
                  }}>{idx + 1}</span>
                  <input
                    type="text"
                    placeholder="分支标题"
                    value={opt.title}
                    onChange={e => {
                      form.branchOptions[idx].title = e.target.value;
                    }}
                    style={{ ...inputStyle, flex: 1, padding: '8px 12px' }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="分支描述"
                  value={opt.description}
                  onChange={e => {
                    form.branchOptions[idx].description = e.target.value;
                  }}
                  style={{ ...inputStyle, padding: '8px 12px' }}
                />
              </div>
            ))}
            {form.branchOptions.length < 5 && (
              <button
                onClick={() => { form.branchOptions.push({ title: '', description: '' }); }}
                style={{
                  background: 'transparent', border: '1px dashed #6C63FF',
                  color: '#6C63FF', padding: '8px 16px', borderRadius: 8,
                  cursor: 'pointer', fontSize: 13
                }}
              >
                + 添加分支选项
              </button>
            )}
          </div>

          <button
            onClick={handleCreateRoom}
            style={buttonStyle}
            onMouseEnter={e => (e.currentTarget.style.background = '#7B73FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#6C63FF')}
          >
            创建房间并开始
          </button>

          {error && <p style={{ color: '#FF6B6B', marginTop: 16 }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (view === 'join') {
    const form = joinFormRef.current;
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)'
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <button
            onClick={() => setView('home')}
            style={{
              background: 'transparent', border: 'none', color: '#B0B0B0',
              cursor: 'pointer', fontSize: 14, marginBottom: 24, padding: 0
            }}
          >
            ← 返回首页
          </button>

          <h2 style={{ fontSize: 28, color: '#E0E0E0', marginBottom: 24 }}>加入故事房间</h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#B0B0B0', marginBottom: 8, fontSize: 14 }}>
              房间码（6位数字）
            </label>
            <input
              type="text"
              placeholder="例如：123456"
              value={form.roomCode}
              onChange={e => { form.roomCode = e.target.value; }}
              maxLength={6}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#B0B0B0', marginBottom: 8, fontSize: 14 }}>
              您的昵称
            </label>
            <input
              type="text"
              placeholder="输入您的昵称"
              value={form.name}
              onChange={e => { form.name = e.target.value; }}
              style={inputStyle}
            />
          </div>

          <button
            onClick={handleJoinRoom}
            style={buttonStyle}
            onMouseEnter={e => (e.currentTarget.style.background = '#7B73FF')}
            onMouseLeave={e => (e.currentTarget.style.background = '#6C63FF')}
          >
            加入房间
          </button>

          {error && <p style={{ color: '#FF6B6B', marginTop: 16 }}>{error}</p>}
        </div>
      </div>
    );
  }

  if (view === 'room' && room) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <RoomHeader room={room} />
        <div style={{
          flex: 1, display: 'flex', overflow: 'hidden',
          paddingTop: 60
        }}>
          <div style={{
            width: '60%', height: '100%',
            position: 'relative', overflow: 'hidden'
          }}>
            <StoryTree
              room={room}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          </div>

          <div style={{
            width: 1, background: '#6C63FF', flexShrink: 0
          }} />

          <div style={{ width: '40%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <EditorPanel
              room={room}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              participantId={participantId || ''}
              userName={userName}
              onSubmitNode={handleSubmitNode}
              newActivities={newActivities}
            />
          </div>
        </div>

        {error && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255, 107, 107, 0.95)', color: '#fff',
            padding: '12px 24px', borderRadius: 8, zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
}

const buttonStyle: React.CSSProperties = {
  padding: '12px 32px',
  borderRadius: 8,
  border: 'none',
  background: '#6C63FF',
  color: '#fff',
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 8,
  border: '1px solid rgba(108, 99, 255, 0.3)',
  background: 'rgba(255, 255, 255, 0.03)',
  color: '#E0E0E0',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box'
};
