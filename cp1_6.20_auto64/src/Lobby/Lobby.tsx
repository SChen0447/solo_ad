import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Room, MapData } from '../types';
import { getRooms, getMaps, createMatch, joinRoom } from '../api';

const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [maps, setMaps] = useState<MapData[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const [selectedSide, setSelectedSide] = useState<'defender' | 'attacker' | 'any'>('any');
  const [isLoading, setIsLoading] = useState(false);
  const playerId = localStorage.getItem('playerId') || '';

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [roomsData, mapsData] = await Promise.all([getRooms(), getMaps()]);
      setRooms(roomsData);
      setMaps(mapsData);
      if (mapsData.length > 0 && !selectedMapId) {
        setSelectedMapId(mapsData[0].id);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const handleCreateMatch = async () => {
    if (!selectedMapId) {
      alert('请先创建并保存一张地图！');
      return;
    }
    setIsLoading(true);
    try {
      const result = await createMatch(playerId, selectedMapId, selectedSide);
      navigate(`/game/${result.roomId}`);
    } catch (error) {
      alert('创建匹配失败，请检查后端服务');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string, side: 'defender' | 'attacker' | 'spectator') => {
    try {
      await joinRoom(roomId, playerId, side);
      if (side === 'spectator') {
        navigate(`/spectate/${roomId}`);
      } else {
        navigate(`/game/${roomId}`);
      }
    } catch (error) {
      alert('加入房间失败');
    }
  };

  const panelStyle: React.CSSProperties = {
    background: 'rgba(30, 42, 58, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '8px',
    padding: '20px',
    color: '#fff'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    color: '#fff',
    background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 102, 255, 0.2) 100%)',
    border: '1px solid transparent',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px'
  };

  const selectedButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    borderImage: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%) 1',
    boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
  };

  const roomCardStyle: React.CSSProperties = {
    padding: '16px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: '8px',
    marginBottom: '12px',
    transition: 'all 0.2s ease'
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#1e2a3a' }}>
      <div style={{ width: '320px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={panelStyle}>
          <button
            style={{ ...buttonStyle, width: '100%', marginBottom: '16px' }}
            onClick={() => navigate('/')}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 10px #00d4ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            ← 返回首页
          </button>
          
          <h2 style={{ color: '#00d4ff', marginBottom: '16px', fontSize: '18px' }}>⚔️ 创建对战</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#aaa' }}>选择地图</label>
            <select
              value={selectedMapId}
              onChange={(e) => setSelectedMapId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '13px'
              }}
            >
              <option value="">-- 请选择地图 --</option>
              {maps.map(map => (
                <option key={map.id} value={map.id}>{map.name}</option>
              ))}
            </select>
            {maps.length === 0 && (
              <p style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '8px' }}>
                暂无地图，请先去编辑器创建地图
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#aaa' }}>选择阵营</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { value: 'defender', label: '🛡️ 防守方' },
                { value: 'attacker', label: '⚔️ 进攻方' },
                { value: 'any', label: '🎲 随机' }
              ].map(side => (
                <button
                  key={side.value}
                  style={selectedSide === side.value ? selectedButtonStyle : { ...buttonStyle, flex: 1, padding: '8px' }}
                  onClick={() => setSelectedSide(side.value as 'defender' | 'attacker' | 'any')}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {side.label}
                </button>
              ))}
            </div>
          </div>

          <button
            style={{ ...selectedButtonStyle, width: '100%', padding: '12px', fontSize: '16px' }}
            onClick={handleCreateMatch}
            disabled={isLoading || !selectedMapId}
            onMouseEnter={(e) => { if (!isLoading && selectedMapId) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 15px #00d4ff'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = selectedSide ? '0 0 10px rgba(0, 212, 255, 0.5)' : 'none'; }}
          >
            {isLoading ? '匹配中...' : '🚀 开始匹配'}
          </button>
        </div>

        <div style={panelStyle}>
          <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>👤 玩家信息</h3>
          <p style={{ fontSize: '13px', color: '#aaa' }}>
            玩家ID: <span style={{ color: '#00d4ff', fontFamily: 'monospace' }}>{playerId.slice(0, 12)}...</span>
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <h2 style={{ color: '#00d4ff', marginBottom: '20px', fontSize: '20px' }}>🏟️ 房间列表</h2>
        
        {rooms.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#667788',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px dashed rgba(0, 212, 255, 0.2)'
          }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</p>
            <p style={{ fontSize: '16px' }}>暂无房间，创建第一个对战房间吧！</p>
          </div>
        ) : (
          rooms.map(room => (
            <div
              key={room.id}
              style={roomCardStyle}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.2)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '4px' }}>{room.name}</h3>
                  <p style={{ fontSize: '12px', color: '#888' }}>
                    地图: {maps.find(m => m.id === room.mapId)?.name || '未知'}
                  </p>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  background: room.status === 'waiting' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 100, 100, 0.2)',
                  color: room.status === 'waiting' ? '#00d4ff' : '#ff6b6b'
                }}>
                  {room.status === 'waiting' ? '等待中' : room.status === 'playing' ? '进行中' : '已结束'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '13px' }}>
                <span style={{ color: room.defenderId ? '#4ade80' : '#888' }}>
                  🛡️ 防守方: {room.defenderId ? '已就位' : '空缺'}
                </span>
                <span style={{ color: room.attackerId ? '#f87171' : '#888' }}>
                  ⚔️ 进攻方: {room.attackerId ? '已就位' : '空缺'}
                </span>
                <span style={{ color: '#aaa' }}>
                  👁️ 观战: {room.spectators.length}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {room.status === 'waiting' && !room.defenderId && (
                  <button
                    style={{ ...buttonStyle, flex: 1 }}
                    onClick={() => handleJoinRoom(room.id, 'defender')}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 10px #00d4ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    加入防守方
                  </button>
                )}
                {room.status === 'waiting' && !room.attackerId && (
                  <button
                    style={{ ...buttonStyle, flex: 1 }}
                    onClick={() => handleJoinRoom(room.id, 'attacker')}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 10px #00d4ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    加入进攻方
                  </button>
                )}
                <button
                  style={{ ...buttonStyle, flex: 1, background: 'rgba(100, 100, 100, 0.2)' }}
                  onClick={() => handleJoinRoom(room.id, 'spectator')}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  👁️ 观战
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Lobby;
