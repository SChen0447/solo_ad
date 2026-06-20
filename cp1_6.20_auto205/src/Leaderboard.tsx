import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import type { GameStats } from './GameBoard';

interface LeaderboardEntry {
  id: number;
  nickname: string;
  total_score: number;
  completion_time: number;
  levels_cleared: number;
  submitted_at: number;
}

interface LeaderboardProps {
  stats: GameStats;
  onRestart: () => void;
  isMobile: boolean;
}

const API_BASE = 'http://localhost:5000/api';

export default function Leaderboard({ stats, onRestart, isMobile }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [nickname, setNickname] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API_BASE}/leaderboard?limit=10`, { timeout: 1500 });
      setEntries(res.data.entries || []);
      setApiAvailable(true);
    } catch (e) {
      setApiAvailable(false);
      const demo: LeaderboardEntry[] = [
        { id: 1, nickname: '迷宫大师', total_score: 980, completion_time: 45.2, levels_cleared: 5, submitted_at: 0 },
        { id: 2, nickname: 'RunnerKing', total_score: 860, completion_time: 52.8, levels_cleared: 5, submitted_at: 0 },
        { id: 3, nickname: '闪电侠', total_score: 745, completion_time: 60.1, levels_cleared: 5, submitted_at: 0 },
        { id: 4, nickname: 'Alice', total_score: 620, completion_time: 73.5, levels_cleared: 4, submitted_at: 0 },
        { id: 5, nickname: 'Bob', total_score: 540, completion_time: 88.3, levels_cleared: 4, submitted_at: 0 },
      ];
      setEntries(demo);
    }
  };

  const sanitizeNickname = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 10);
  };

  const handleSubmit = async () => {
    const clean = sanitizeNickname(nickname.trim());
    if (!clean) {
      setError('请输入有效昵称（1-10字符，仅字母数字空格_-）');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE}/score`,
        {
          nickname: clean,
          total_score: stats.totalScore,
          completion_time: stats.totalTime,
          levels_cleared: stats.levelsCleared,
        },
        { timeout: 1500 }
      );
      setSubmitted(true);
      const entry: LeaderboardEntry = res.data.entry;
      setMyEntry(entry);
      fetchLeaderboard();
    } catch (e) {
      const localEntry: LeaderboardEntry = {
        id: Date.now(),
        nickname: clean,
        total_score: stats.totalScore,
        completion_time: stats.totalTime,
        levels_cleared: stats.levelsCleared,
        submitted_at: Math.floor(Date.now() / 1000),
      };
      setEntries((prev) => {
        const merged = [...prev, localEntry].sort((a, b) => b.total_score - a.total_score).slice(0, 10);
        return merged;
      });
      setSubmitted(true);
      setMyEntry(localEntry);
      setApiAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(1);
    return m > 0 ? `${m}:${s.padStart(4, '0')}` : `${s}s`;
  };

  const panelWidth = isMobile ? Math.min(window.innerWidth - 32, 280) : 280;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        padding: isMobile ? 12 : 16,
        flexDirection: isMobile ? 'column' : 'row',
        gap: 20,
        overflowY: 'auto',
      }}
    >
      <motion.div
        initial={{ y: -30, opacity: 0, scale: 0.92 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 22 }}
        style={{
          background: 'rgba(20,20,50,0.82)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18,
          padding: isMobile ? 20 : 28,
          width: isMobile ? '100%' : 420,
          color: '#fff',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          maxWidth: '100%',
        }}
      >
        <motion.h2
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08 }}
          style={{
            textAlign: 'center',
            fontSize: isMobile ? 24 : 30,
            fontWeight: 800,
            marginBottom: 20,
            background: 'linear-gradient(90deg, #ffd700 0%, #ff6b6b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          🎮 游戏结束
        </motion.h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
          <StatCard label="总积分" value={stats.totalScore.toString()} accent="#ffd700" delay={0.1} />
          <StatCard label="通关数" value={`${stats.levelsCleared} / 5`} accent="#4ecdc4" delay={0.15} />
          <StatCard label="总用时" value={formatTime(stats.totalTime)} accent="#6a11cb" delay={0.2} />
          <StatCard label="最高连击" value={`x${stats.bestCombo}`} accent="#ff6b6b" delay={0.25} />
        </div>

        <AnimatePresence>
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <label style={{ fontSize: 13, color: '#b8b8d8' }}>
                输入昵称提交成绩（最多10字符）
              </label>
              <input
                type="text"
                maxLength={10}
                value={nickname}
                onChange={(e) => {
                  setNickname(sanitizeNickname(e.target.value));
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="你的昵称"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
              {error && <div style={{ color: '#ff6b6b', fontSize: 12 }}>{error}</div>}
              {!apiAvailable && (
                <div style={{ color: '#ffa654', fontSize: 12 }}>
                  ⚠️ 后端API未启动，成绩仅保存在本地
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  marginTop: 4,
                  background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 6px 20px rgba(106,17,203,0.5)',
                }}
              >
                {loading ? '提交中…' : '提交成绩'}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="submitted"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{ textAlign: 'center', color: '#4ecdc4', fontWeight: 600, padding: 8 }}
            >
              ✅ 成绩已提交！
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.96 }}
          onClick={onRestart}
          style={{
            marginTop: 14,
            width: '100%',
            background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            color: '#fff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(17,153,142,0.4)',
          }}
        >
          🔄 再来一局
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, delay: 0.15 }}
        style={{
          width: panelWidth,
          maxHeight: isMobile ? 320 : 400,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 18,
          padding: 14,
          color: '#fff',
          boxShadow: '0 16px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: isMobile ? 16 : 18,
            marginBottom: 10,
            textAlign: 'center',
            paddingBottom: 10,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          🏆 排行榜 Top 10
        </div>

        <div
          style={{
            overflowY: 'auto',
            paddingRight: 4,
            flex: 1,
          }}
        >
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#a0a0c0', fontSize: 13, padding: 20 }}>
              暂无记录，成为第一个上榜的玩家吧！
            </div>
          ) : (
            entries.map((entry, i) => {
              const isMe = myEntry && entry.id === myEntry.id;
              const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
              return (
                <motion.div
                  key={entry.id}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.02 * i }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 10,
                    marginBottom: 4,
                    background: isMe
                      ? 'linear-gradient(90deg, rgba(255,215,0,0.22) 0%, rgba(255,180,0,0.12) 100%)'
                      : 'rgba(255,255,255,0.04)',
                    border: isMe ? '1px solid rgba(255,215,0,0.55)' : '1px solid rgba(255,255,255,0.05)',
                    boxShadow: isMe ? '0 0 12px rgba(255,215,0,0.2)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: i < 3
                        ? `linear-gradient(135deg, ${medalColors[i]} 0%, ${medalColors[i]}aa 100%)`
                        : 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                      color: i < 3 ? '#1a1a3e' : '#fff',
                      marginRight: 8,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: isMe ? 700 : 500,
                        fontSize: isMobile ? 12 : 13,
                        color: isMe ? '#ffd700' : '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.nickname}
                      {isMe && <span style={{ marginLeft: 4, fontSize: 10 }}>（我）</span>}
                    </div>
                    <div style={{ fontSize: 10, color: '#a0a0c0', marginTop: 2 }}>
                      {formatTime(entry.completion_time)} · Lv{entry.levels_cleared}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: isMobile ? 13 : 15,
                      color: i < 3 ? medalColors[i] : '#fff',
                      marginLeft: 6,
                      flexShrink: 0,
                    }}
                  >
                    {entry.total_score}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, accent, delay }: { label: string; value: string; accent: string; delay: number }) {
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay }}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${accent}33`,
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 11, color: '#a0a0c0', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent }}>{value}</div>
    </motion.div>
  );
}
