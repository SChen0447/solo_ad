import { useState } from 'react';
import { PlayerInfo, RoomSettings } from '../types';

interface LobbyProps {
  nickname: string;
  roomCode: string;
  isHost: boolean;
  players: Record<string, PlayerInfo>;
  settings: RoomSettings;
  onCreateRoom: (nickname: string, roundDuration: number, totalRounds: number) => void;
  onJoinRoom: (roomCode: string, nickname: string) => void;
  onStart: () => void;
  onUpdateSettings: (settings: RoomSettings) => void;
}

export default function Lobby({
  nickname,
  roomCode,
  isHost,
  players,
  settings,
  onCreateRoom,
  onJoinRoom,
  onStart,
  onUpdateSettings,
}: LobbyProps) {
  const [inputNick, setInputNick] = useState('');
  const [inputRoom, setInputRoom] = useState('');
  const [mode, setMode] = useState<'home' | 'create' | 'join' | 'waiting'>('home');
  const [roundDuration, setRoundDuration] = useState(5);
  const [totalRounds, setTotalRounds] = useState(10);

  const playerList = Object.values(players);
  const inRoom = roomCode !== '';

  const handleCreate = () => {
    const nick = inputNick.trim();
    if (!nick || nick.length < 2 || nick.length > 8) return;
    onCreateRoom(nick, roundDuration, totalRounds);
    setMode('waiting');
  };

  const handleJoin = () => {
    const nick = inputNick.trim();
    const room = inputRoom.trim();
    if (!nick || nick.length < 2 || nick.length > 8) return;
    if (!room || room.length !== 6) return;
    onJoinRoom(room, nick);
    setMode('waiting');
  };

  if (inRoom || mode === 'waiting') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>⚔️ 随机决斗</h1>

          <div style={styles.roomCodeBox}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
              房间码
            </div>
            <div style={styles.roomCode}>
              {roomCode}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
              分享房间码给好友加入
            </div>
          </div>

          {isHost && (
            <div style={styles.settingsBox}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
                ⚙️ 房间设置
              </div>
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>每轮时长: {roundDuration}秒</label>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={roundDuration}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setRoundDuration(v);
                    onUpdateSettings({ round_duration: v, total_rounds: totalRounds });
                  }}
                  style={styles.slider}
                />
              </div>
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>总轮数: {totalRounds}轮</label>
                <input
                  type="range"
                  min={5}
                  max={15}
                  value={totalRounds}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTotalRounds(v);
                    onUpdateSettings({ round_duration: roundDuration, total_rounds: v });
                  }}
                  style={styles.slider}
                />
              </div>
            </div>
          )}

          <div style={styles.playersSection}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
              玩家 ({playerList.length}/4)
            </div>
            <div style={styles.playerList}>
              {playerList.map((p, i) => (
                <div key={p.player_id} style={styles.playerCapsule}>
                  <div style={{
                    ...styles.playerAvatar,
                    backgroundColor: p.color || ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'][i % 4],
                  }} />
                  <span style={styles.playerName}>{p.nickname}</span>
                  {p.is_host && <span style={styles.hostBadge}>房主</span>}
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <button
              style={{
                ...styles.startBtn,
                opacity: playerList.length >= 2 ? 1 : 0.4,
                cursor: playerList.length >= 2 ? 'pointer' : 'not-allowed',
              }}
              onClick={onStart}
              disabled={playerList.length < 2}
            >
              🎮 开始游戏
            </button>
          )}

          {!isHost && (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 16 }}>
              等待房主开始游戏...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <button style={styles.backBtn} onClick={() => setMode('home')}>← 返回</button>
          <h2 style={styles.subtitle}>创建房间</h2>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>昵称 (2-8个字符)</label>
            <input
              style={styles.input}
              value={inputNick}
              onChange={(e) => setInputNick(e.target.value)}
              placeholder="输入你的昵称"
              maxLength={8}
            />
          </div>

          <div style={styles.settingsBox}>
            <div style={styles.settingRow}>
              <label style={styles.settingLabel}>每轮时长: {roundDuration}秒</label>
              <input
                type="range"
                min={3}
                max={8}
                value={roundDuration}
                onChange={(e) => setRoundDuration(Number(e.target.value))}
                style={styles.slider}
              />
            </div>
            <div style={styles.settingRow}>
              <label style={styles.settingLabel}>总轮数: {totalRounds}轮</label>
              <input
                type="range"
                min={5}
                max={15}
                value={totalRounds}
                onChange={(e) => setTotalRounds(Number(e.target.value))}
                style={styles.slider}
              />
            </div>
          </div>

          <button
            style={{
              ...styles.actionBtn,
              opacity: inputNick.trim().length >= 2 ? 1 : 0.4,
            }}
            onClick={handleCreate}
            disabled={inputNick.trim().length < 2}
          >
            创建房间
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <button style={styles.backBtn} onClick={() => setMode('home')}>← 返回</button>
          <h2 style={styles.subtitle}>加入房间</h2>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>昵称 (2-8个字符)</label>
            <input
              style={styles.input}
              value={inputNick}
              onChange={(e) => setInputNick(e.target.value)}
              placeholder="输入你的昵称"
              maxLength={8}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>房间码 (6位数字)</label>
            <input
              style={styles.input}
              value={inputRoom}
              onChange={(e) => setInputRoom(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="输入房间码"
              maxLength={6}
            />
          </div>

          <button
            style={{
              ...styles.actionBtn,
              opacity: inputNick.trim().length >= 2 && inputRoom.length === 6 ? 1 : 0.4,
            }}
            onClick={handleJoin}
            disabled={inputNick.trim().length < 2 || inputRoom.length !== 6}
          >
            加入房间
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>⚔️ 随机决斗</h1>
        <p style={styles.desc}>
          快节奏多人反应对战！<br />
          随机指令，极限反应，谁是最强王者？
        </p>
        <div style={styles.homeBtns}>
          <button style={styles.actionBtn} onClick={() => setMode('create')}>
            🏠 创建房间
          </button>
          <button
            style={{ ...styles.actionBtn, background: 'rgba(52,152,219,0.3)', border: '1px solid rgba(52,152,219,0.6)' }}
            onClick={() => setMode('join')}
          >
            🚪 加入房间
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: 20,
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    padding: '40px 36px',
    maxWidth: 460,
    width: '100%',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: 36,
    fontWeight: 800,
    textAlign: 'center' as const,
    marginBottom: 8,
    background: 'linear-gradient(135deg, #fff, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'center' as const,
    marginBottom: 24,
    color: '#fff',
  },
  desc: {
    textAlign: 'center' as const,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 28,
  },
  roomCodeBox: {
    textAlign: 'center' as const,
    padding: '20px 0',
    marginBottom: 20,
  },
  roomCode: {
    fontFamily: 'monospace',
    fontSize: 48,
    fontWeight: 900,
    letterSpacing: 12,
    color: '#fff',
    textShadow: '0 0 15px rgba(255,255,255,0.6), 0 0 30px rgba(167,139,250,0.4)',
  },
  settingsBox: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: '16px 20px',
    marginBottom: 20,
  },
  settingRow: {
    marginBottom: 12,
  },
  settingLabel: {
    display: 'block',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  slider: {
    width: '100%',
    accentColor: '#a78bfa',
  },
  playersSection: {
    marginBottom: 20,
  },
  playerList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  playerCapsule: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: '6px 14px 6px 8px',
    fontSize: 14,
  },
  playerAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    flexShrink: 0,
  },
  playerName: {
    color: '#fff',
    fontWeight: 600,
  },
  hostBadge: {
    fontSize: 10,
    background: 'rgba(167,139,250,0.3)',
    color: '#a78bfa',
    padding: '2px 8px',
    borderRadius: 10,
    fontWeight: 700,
  },
  startBtn: {
    width: '100%',
    padding: '14px 0',
    fontSize: 18,
    fontWeight: 700,
    border: 'none',
    borderRadius: 14,
    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  actionBtn: {
    width: '100%',
    padding: '14px 0',
    fontSize: 16,
    fontWeight: 700,
    border: 'none',
    borderRadius: 14,
    background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 8,
  },
  homeBtns: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    display: 'block',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    color: '#fff',
    outline: 'none',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: 16,
    padding: 0,
  },
};
