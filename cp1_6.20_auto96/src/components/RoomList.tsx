import React, { useEffect, useState } from 'react';
import { listRooms, createRoom, joinRoom, JoinResult, RoomInfo } from '../api/gameApi';

export interface RoomListProps {
  onJoinedRoom: (result: JoinResult) => void;
}

const RoomList: React.FC<RoomListProps> = ({ onJoinedRoom }) => {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      const data = await listRooms();
      setRooms(data);
    } catch (e) {
      setError('无法连接到服务器，请确认后端已启动');
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('请先输入玩家名称');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await createRoom(
        roomName.trim() || `房间-${Math.floor(Math.random() * 9000) + 1000}`,
        playerName.trim(),
      );
      onJoinedRoom(result);
    } catch (e: any) {
      setError(e.response?.data?.error || '创建房间失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (rid?: string) => {
    if (!playerName.trim()) {
      setError('请先输入玩家名称');
      return;
    }
    const target = rid || joinRoomId.trim();
    if (!target) {
      setError('请输入房间号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await joinRoom(target.toUpperCase(), playerName.trim());
      onJoinedRoom(result);
    } catch (e: any) {
      setError(e.response?.data?.error || '加入房间失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0c29 0%, #24243e 50%, #302b63 100%)',
        padding: '40px 24px',
        color: 'white',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              fontSize: 56,
              marginBottom: 8,
              filter: 'drop-shadow(0 0 30px rgba(212,175,55,0.5))',
            }}
          >
            ⚔️
          </div>
          <h1
            style={{
              fontSize: 44,
              color: '#d4af37',
              margin: 0,
              letterSpacing: 6,
              textShadow: '0 0 30px rgba(212,175,55,0.4)',
              fontWeight: 900,
            }}
          >
            六边形领地战争
          </h1>
          <p style={{ color: '#aaa', marginTop: 8, fontSize: 15 }}>
            卡牌收集 · 领地争夺 · 多人策略
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              background: 'rgba(26,26,46,0.8)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#d4af37', fontSize: 18 }}>
              ✨ 创建房间
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <InputField
                label="玩家名称"
                value={playerName}
                onChange={setPlayerName}
                placeholder="输入你的名字..."
              />
              <InputField
                label="房间名称 (可选)"
                value={roomName}
                onChange={setRoomName}
                placeholder="霸气的房间名..."
              />
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                style={btnStyle}
              >
                🚀 创建并加入房间
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(26,26,46,0.8)',
              border: '1px solid rgba(212,175,55,0.2)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#d4af37', fontSize: 18 }}>
              🔑 输入房间号加入
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <InputField
                label="玩家名称"
                value={playerName}
                onChange={setPlayerName}
                placeholder="输入你的名字..."
              />
              <InputField
                label="房间号"
                value={joinRoomId}
                onChange={(v) => setJoinRoomId(v.toUpperCase())}
                placeholder="6位房间号..."
                uppercase
              />
              <button
                onClick={() => handleJoinRoom()}
                disabled={loading}
                style={{ ...btnStyle, background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' }}
              >
                🎯 加入房间
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(231,76,60,0.2)',
              border: '1px solid #e74c3c',
              color: '#e74c3c',
              padding: '12px 20px',
              borderRadius: 10,
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: '#d4af37', fontSize: 18 }}>
            🏛️ 房间列表 ({rooms.length})
          </h3>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#d4af37',
              padding: '6px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            🔄 刷新
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {rooms.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                background: 'rgba(255,255,255,0.03)',
                border: '1px dashed rgba(212,175,55,0.2)',
                borderRadius: 14,
                padding: '50px 20px',
                textAlign: 'center',
                color: '#666',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 10 }}>🎲</div>
              暂无房间，快去创建一个吧！
            </div>
          ) : (
            rooms.map((r) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                waiting: { label: '等待中', color: '#f1c40f' },
                playing: { label: '游戏中', color: '#2ecc71' },
                ended: { label: '已结束', color: '#e74c3c' },
              };
              const st = statusMap[r.status] || statusMap.waiting;
              return (
                <div
                  key={r.id}
                  onClick={() => r.status === 'waiting' && handleJoinRoom(r.id)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(26,26,46,0.9) 0%, rgba(48,43,99,0.9) 100%)',
                    border: `1px solid ${r.status === 'waiting' ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14,
                    padding: 20,
                    cursor: r.status === 'waiting' ? 'pointer' : 'not-allowed',
                    opacity: r.status === 'playing' ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (r.status === 'waiting') {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        '0 12px 40px rgba(212,175,55,0.25), 0 4px 12px rgba(0,0,0,0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 'bold',
                          color: '#d4af37',
                          letterSpacing: 3,
                          fontFamily: 'monospace',
                        }}
                      >
                        {r.id}
                      </div>
                      <div style={{ color: '#ddd', fontSize: 14, marginTop: 2 }}>{r.name}</div>
                    </div>
                    <span
                      style={{
                        background: `${st.color}22`,
                        color: st.color,
                        padding: '3px 10px',
                        borderRadius: 10,
                        fontSize: 12,
                        border: `1px solid ${st.color}44`,
                      }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: '#aaa',
                    }}
                  >
                    <span>👥</span>
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(r.playerCount / r.maxPlayers) * 100}%`,
                          background: r.playerCount >= 2 ? '#2ecc71' : '#d4af37',
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <b style={{ color: '#eee' }}>
                      {r.playerCount}/{r.maxPlayers}
                    </b>
                  </div>
                  {r.status === 'waiting' && (
                    <div
                      style={{
                        marginTop: 14,
                        textAlign: 'center',
                        padding: '8px',
                        background: 'rgba(212,175,55,0.08)',
                        borderRadius: 8,
                        color: '#d4af37',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      点击加入 →
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            marginTop: 48,
            padding: 24,
            background: 'rgba(26,26,46,0.6)',
            borderRadius: 16,
            border: '1px solid rgba(212,175,55,0.15)',
          }}
        >
          <h4 style={{ margin: '0 0 16px 0', color: '#d4af37' }}>📖 游戏规则</h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 14,
              fontSize: 13,
              color: '#bbb',
            }}
          >
            <RuleItem icon="🏰" title="占领" desc="占领一个与己方相邻的空格" />
            <RuleItem icon="🛡️" title="强化" desc="提升己方领地耐久度（最多3层）" />
            <RuleItem icon="⚔️" title="移动" desc="将己方领地迁移至相邻空格" />
            <RuleItem icon="⛓️" title="封锁" desc="使对方领地本回合不可用" />
            <RuleItem icon="⚡" title="闪电" desc="直接夺取对方一个领地" />
            <RuleItem icon="🏆" title="胜利条件" desc="率先占领 60% 领地的玩家获胜" />
          </div>
        </div>
      </div>
    </div>
  );
};

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  uppercase?: boolean;
}> = ({ label, value, onChange, placeholder, uppercase }) => (
  <div>
    <div style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>{label}</div>
    <input
      value={value}
      onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'white',
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.2s',
      }}
      onFocus={(e) => {
        (e.target as HTMLInputElement).style.borderColor = '#d4af37';
        (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(212,175,55,0.15)';
      }}
      onBlur={(e) => {
        (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)';
        (e.target as HTMLInputElement).style.boxShadow = 'none';
      }}
    />
  </div>
);

const RuleItem: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div
    style={{
      display: 'flex',
      gap: 10,
      padding: '10px 12px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 10,
    }}
  >
    <div style={{ fontSize: 22 }}>{icon}</div>
    <div>
      <div style={{ color: '#d4af37', fontWeight: 'bold', fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 12, marginTop: 2 }}>{desc}</div>
    </div>
  </div>
);

const btnStyle: React.CSSProperties = {
  marginTop: 6,
  padding: '12px 20px',
  background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
  color: '#1a1a2e',
  border: 'none',
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 'bold',
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(212,175,55,0.3)',
  transition: 'all 0.2s ease',
  letterSpacing: 1,
};

export default RoomList;
