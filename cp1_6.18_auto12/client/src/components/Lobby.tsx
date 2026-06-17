import { useState, useEffect, useRef } from 'react';
import { CharacterCustomization, RoomInfo, PlayerInfo } from '../types';
import { HAIR_STYLES, HAIR_COLORS, SHIRT_COLORS, PANTS_COLORS, SKIN_COLORS, ACCESSORY_TYPES } from '../customization';
import { drawCharacter, CharacterPose } from '../characterRenderer';
import socket from '../socket';

interface LobbyProps {
  nickname: string;
  onNicknameChange: (name: string) => void;
  customization: CharacterCustomization;
  onCustomizationChange: (c: CharacterCustomization) => void;
  onJoinRoom: (roomId: string, playerId: string, players: PlayerInfo[], isHost: boolean) => void;
}

export default function Lobby({
  nickname,
  onNicknameChange,
  customization,
  onCustomizationChange,
  onJoinRoom,
}: LobbyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [pose, setPose] = useState<CharacterPose>('idle');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const animFrameRef = useRef<number>(0);
  const frameRef = useRef(0);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      frameRef.current += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCharacter(ctx, canvas.width / 2, canvas.height / 2 + 20, customization, 3, pose, frameRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [customization, pose]);

  const fetchRooms = () => {
    socket.emit('getRoomList', (roomList: RoomInfo[]) => {
      setRooms(roomList);
    });
  };

  const handleCreateRoom = () => {
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    if (!newRoomName.trim()) {
      setError('请输入房间名');
      return;
    }

    setLoading(true);
    setError('');

    socket.emit(
      'createRoom',
      { name: newRoomName.trim(), nickname: nickname.trim(), customization },
      (response: { success: boolean; error?: string; roomId?: string; playerId?: string; players?: any[] }) => {
        setLoading(false);
        if (response.success && response.roomId && response.playerId && response.players) {
          onJoinRoom(response.roomId, response.playerId, response.players, true);
        } else {
          setError(response.error || '创建房间失败');
        }
      }
    );
  };

  const handleJoinRoom = (roomId: string) => {
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }

    setLoading(true);
    setError('');

    socket.emit(
      'joinRoom',
      { roomId, nickname: nickname.trim(), customization },
      (response: { success: boolean; error?: string; roomId?: string; playerId?: string; players?: any[] }) => {
        setLoading(false);
        if (response.success && response.roomId && response.playerId && response.players) {
          onJoinRoom(response.roomId, response.playerId, response.players, false);
        } else {
          setError(response.error || '加入房间失败');
        }
      }
    );
  };

  const updateCustomization = <K extends keyof CharacterCustomization>(
    key: K,
    value: CharacterCustomization[K]
  ) => {
    onCustomizationChange({ ...customization, [key]: value });
  };

  const poses: { id: CharacterPose; name: string }[] = [
    { id: 'idle', name: '待机' },
    { id: 'walk', name: '行走' },
    { id: 'jump', name: '跳跃' },
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          <span style={styles.titleAccent}>⚔</span> 多人竞技场
          <span style={styles.titleAccent}>⚔</span>
        </h1>
        <p style={styles.subtitle}>自定义角色 · 实时对战 · 2v2 3v3</p>
      </header>

      <div style={styles.mainContent}>
        <div style={styles.leftPanel}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>角色外观</h2>

            <div style={styles.inputGroup}>
              <label style={styles.label}>昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => onNicknameChange(e.target.value)}
                placeholder="输入你的昵称"
                style={styles.textInput}
                maxLength={12}
              />
            </div>

            <div style={styles.optionGroup}>
              <label style={styles.label}>发型</label>
              <div style={styles.optionRow}>
                {HAIR_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => updateCustomization('hairStyle', s.id)}
                    style={{
                      ...styles.optionButton,
                      ...(customization.hairStyle === s.id ? styles.optionButtonActive : {}),
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.optionGroup}>
              <label style={styles.label}>发色</label>
              <div style={styles.colorRow}>
                {HAIR_COLORS.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => updateCustomization('hairColor', color)}
                    style={{
                      ...styles.colorButton,
                      backgroundColor: color,
                      ...(customization.hairColor === color ? styles.colorButtonActive : {}),
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={styles.optionGroup}>
              <label style={styles.label}>上衣颜色</label>
              <div style={styles.colorRow}>
                {SHIRT_COLORS.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => updateCustomization('shirtColor', color)}
                    style={{
                      ...styles.colorButton,
                      backgroundColor: color,
                      ...(customization.shirtColor === color ? styles.colorButtonActive : {}),
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={styles.optionGroup}>
              <label style={styles.label}>裤子颜色</label>
              <div style={styles.colorRow}>
                {PANTS_COLORS.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => updateCustomization('pantsColor', color)}
                    style={{
                      ...styles.colorButton,
                      backgroundColor: color,
                      ...(customization.pantsColor === color ? styles.colorButtonActive : {}),
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={styles.optionGroup}>
              <label style={styles.label}>皮肤色</label>
              <div style={styles.colorRow}>
                {SKIN_COLORS.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => updateCustomization('skinColor', color)}
                    style={{
                      ...styles.colorButton,
                      backgroundColor: color,
                      ...(customization.skinColor === color ? styles.colorButtonActive : {}),
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={styles.optionGroup}>
              <label style={styles.label}>配饰</label>
              <div style={styles.optionRow}>
                {ACCESSORY_TYPES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => updateCustomization('accessoryType', a.id)}
                    style={{
                      ...styles.optionButton,
                      ...(customization.accessoryType === a.id ? styles.optionButtonActive : {}),
                    }}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.optionGroup}>
              <label style={styles.label}>动画预览</label>
              <div style={styles.optionRow}>
                {poses.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPose(p.id)}
                    style={{
                      ...styles.optionButton,
                      ...(pose === p.id ? styles.optionButtonActive : {}),
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.centerPanel}>
          <div style={styles.previewContainer}>
            <div style={styles.previewGlow} />
            <canvas
              ref={canvasRef}
              width={280}
              height={400}
              style={styles.previewCanvas}
            />
            <div style={styles.previewLabel}>角色预览</div>
          </div>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>房间列表</h2>
              <button onClick={fetchRooms} style={styles.refreshButton}>
                刷新
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              style={styles.createButton}
            >
              + 创建房间
            </button>

            {error && <div style={styles.errorText}>{error}</div>}

            <div style={styles.roomList}>
              {rooms.length === 0 ? (
                <div style={styles.emptyRooms}>
                  <p>暂无房间</p>
                  <p style={styles.emptySubtext}>创建一个新房间开始游戏吧！</p>
                </div>
              ) : (
                rooms.map((room, index) => (
                  <div
                    key={room.id}
                    style={{
                      ...styles.roomCard,
                      animation: `fadeInUp 0.4s ease ${index * 0.1}s both`,
                    }}
                  >
                    <div style={styles.roomCardContent}>
                      <h3 style={styles.roomName}>{room.name}</h3>
                      <p style={styles.roomHost}>房主：{room.hostName}</p>
                      <p style={styles.roomPlayers}>
                        <span
                          style={{
                            color:
                              room.playerCount >= room.maxPlayers
                                ? 'var(--danger)'
                                : 'var(--success)',
                          }}
                        >
                          {room.playerCount}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>/{room.maxPlayers} 人</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={room.playerCount >= room.maxPlayers || loading}
                      style={{
                        ...styles.joinButton,
                        ...(room.playerCount >= room.maxPlayers
                          ? styles.joinButtonDisabled
                          : {}),
                      }}
                    >
                      {room.playerCount >= room.maxPlayers ? '已满' : '进入'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>创建房间</h2>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="输入房间名称"
              style={styles.modalInput}
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                style={styles.confirmButton}
              >
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    minHeight: '100vh',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'linear-gradient(135deg, var(--bg-primary) 0%, #0a1628 50%, var(--bg-primary) 100%)',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
    zIndex: 1,
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '4px',
    textShadow: '0 0 20px var(--accent-glow)',
  },
  titleAccent: {
    color: 'var(--accent-primary)',
    margin: '0 10px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    marginTop: '5px',
    letterSpacing: '2px',
  },
  mainContent: {
    display: 'flex',
    gap: '20px',
    width: '100%',
    maxWidth: '1400px',
    flex: 1,
    zIndex: 1,
  },
  leftPanel: {
    width: '320px',
    flexShrink: 0,
  },
  centerPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightPanel: {
    width: '380px',
    flexShrink: 0,
  },
  section: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: 'var(--glass-shadow)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '15px',
    borderBottom: '2px solid var(--accent-primary)',
    paddingBottom: '8px',
    display: 'inline-block',
  },
  inputGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    marginBottom: '8px',
    fontWeight: 500,
  },
  textInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(0, 0, 0, 0.2)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
  },
  optionGroup: {
    marginBottom: '15px',
  },
  optionRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  optionButton: {
    padding: '8px 14px',
    borderRadius: '20px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    border: '1px solid transparent',
    transition: 'all 0.2s ease',
  },
  optionButtonActive: {
    background: 'rgba(0, 229, 255, 0.15)',
    color: 'var(--accent-primary)',
    borderColor: 'var(--accent-primary)',
    boxShadow: '0 0 10px var(--accent-glow)',
  },
  colorRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  colorButton: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  colorButtonActive: {
    borderColor: 'var(--accent-primary)',
    boxShadow: '0 0 12px var(--accent-glow)',
    transform: 'scale(1.15)',
  },
  previewContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  previewGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
    animation: 'pulse 3s ease-in-out infinite',
  },
  previewCanvas: {
    position: 'relative',
    animation: 'float 4s ease-in-out infinite',
  },
  previewLabel: {
    marginTop: '15px',
    color: 'var(--accent-primary)',
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: '2px',
  },
  refreshButton: {
    padding: '6px 14px',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    transition: 'all 0.2s ease',
  },
  createButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: 'var(--bg-primary)',
    fontSize: '1rem',
    fontWeight: 700,
    marginBottom: '15px',
    transition: 'all 0.2s ease',
  },
  errorText: {
    color: 'var(--danger)',
    fontSize: '0.85rem',
    marginBottom: '10px',
    textAlign: 'center',
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  emptyRooms: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--text-muted)',
  },
  emptySubtext: {
    fontSize: '0.8rem',
    marginTop: '8px',
  },
  roomCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid var(--glass-border)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(8px)',
  },
  roomCardContent: {
    flex: 1,
  },
  roomName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  roomHost: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
  },
  roomPlayers: {
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  joinButton: {
    padding: '8px 20px',
    borderRadius: '8px',
    background: 'var(--accent-primary)',
    color: 'var(--bg-primary)',
    fontSize: '0.9rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  joinButtonDisabled: {
    background: 'var(--text-muted)',
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'var(--bg-secondary)',
    borderRadius: '16px',
    padding: '30px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid var(--glass-border)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '20px',
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid var(--glass-border)',
    background: 'rgba(0, 0, 0, 0.3)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    marginBottom: '20px',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  confirmButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
    color: 'var(--bg-primary)',
    fontSize: '0.95rem',
    fontWeight: 700,
    transition: 'all 0.2s ease',
  },
};
