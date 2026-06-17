import React, { useEffect, useState } from 'react';
import { RoundRankingItem, Player } from '../../types';

interface ScoreBoardProps {
  rankings: RoundRankingItem[];
  players: Player[];
  currentRound: number;
  totalRounds: number;
  showRoundEnd: boolean;
}

const getRankColor = (rank: number): string => {
  switch (rank) {
    case 1:
      return '#FFD700';
    case 2:
      return '#C0C0C0';
    case 3:
      return '#CD7F32';
    default:
      return '#6B6B80';
  }
};

const getRankGlow = (rank: number): string => {
  switch (rank) {
    case 1:
      return '0 0 30px rgba(255, 215, 0, 0.6)';
    case 2:
      return '0 0 25px rgba(192, 192, 192, 0.5)';
    case 3:
      return '0 0 20px rgba(205, 127, 50, 0.4)';
    default:
      return '0 0 10px rgba(107, 107, 128, 0.3)';
  }
};

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  rankings,
  players,
  currentRound,
  totalRounds,
  showRoundEnd,
}) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(false);
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [showRoundEnd, currentRound]);

  const displayRankings = showRoundEnd
    ? rankings
    : players.map((p, idx) => ({
        rank: idx + 1,
        player_id: p.id,
        name: p.name,
        avatar: p.avatar,
        avatar_bg: p.avatar_bg,
        accuracy: 0,
        duration: 0,
        recognized_text: '',
        round_score: p.total_score,
        accuracy_score: 0,
        duration_score: 0,
        final_score: p.total_score,
      }));

  const sortedForDisplay = [...displayRankings].sort(
    (a, b) => (b.round_score ?? b.final_score ?? 0) - (a.round_score ?? a.final_score ?? 0)
  );

  const maxScore = Math.max(
    100,
    ...sortedForDisplay.map((r) => r.round_score ?? r.final_score ?? 0)
  );

  const playVictorySound = () => {
    try {
      const AudioCtx =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.25);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
      setTimeout(() => ctx.close(), 1000);
    } catch (_) {}
  };

  useEffect(() => {
    if (showRoundEnd && rankings.length > 0 && rankings[0].rank === 1) {
      playVictorySound();
    }
  }, [showRoundEnd, rankings]);

  return (
    <div className="card p-4 md:p-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2
          className="text-xl md:text-2xl font-bold"
          style={{
            fontFamily: 'Orbitron, sans-serif',
          }}
        >
          <span className="neon-text">🏆 排行榜</span>
        </h2>
        <div
          className="px-4 py-2 rounded-xl font-bold"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(255, 0, 127, 0.2))',
            border: '1px solid rgba(0, 212, 255, 0.3)',
          }}
        >
          <span style={{ color: '#FFD700' }}>第 {currentRound}</span>
          <span style={{ color: '#6B6B80' }}> / {totalRounds} 轮</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 pr-1">
        {sortedForDisplay.map((r, idx) => {
          const score = r.round_score ?? r.final_score ?? 0;
          const percent = (score / maxScore) * 100;
          const rank = idx + 1;
          const color = getRankColor(rank);
          return (
            <div
              key={r.player_id}
              className="relative"
              style={{
                animation: animated ? `scorePop 0.6s ease-out ${idx * 0.08}s both` : 'none',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex items-center justify-center text-lg md:text-xl font-black rounded-xl flex-shrink-0"
                  style={{
                    width: '36px',
                    height: '36px',
                    background: `${color}33`,
                    border: `2px solid ${color}`,
                    color: color,
                    boxShadow: getRankGlow(rank),
                  }}
                >
                  {rank}
                </div>
                <div
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xl md:text-2xl flex-shrink-0"
                  style={{
                    background: r.avatar_bg,
                    border: `2px solid ${color}55`,
                  }}
                >
                  {r.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="font-bold truncate text-sm md:text-base"
                      style={{ color: rank <= 3 ? color : '#FFFFFF' }}
                    >
                      {r.name}
                      {rank === 1 && showRoundEnd && (
                        <span
                          style={{
                            animation: 'victoryFanfare 0.8s ease-in-out infinite',
                            display: 'inline-block',
                          }}
                        >
                          🏆
                        </span>
                      )}
                    </p>
                  </div>
                  {showRoundEnd && 'accuracy' in r && (
                    <p className="text-xs md:text-sm" style={{ color: '#6B6B80' }}>
                      准确率 {(r.accuracy * 100).toFixed(0)}% · 用时 {r.duration.toFixed(1)}s
                    </p>
                  )}
                </div>
                <div
                  className="text-xl md:text-2xl font-black flex-shrink-0"
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    color: color,
                    textShadow: `0 0 10px ${color}88`,
                  }}
                >
                  {score.toFixed(0)}
                </div>
              </div>

              <div
                className="ml-[84px] md:ml-[96px] rounded-full overflow-hidden h-4 md:h-5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                }}
              >
                <div
                  className="h-full rounded-full transition-all ease-out"
                  style={{
                    width: animated ? `${percent}%` : '0%',
                    transitionDuration: '1s',
                    background: `linear-gradient(90deg, ${color}88, ${color})`,
                    boxShadow: `0 0 15px ${color}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScoreBoard;
