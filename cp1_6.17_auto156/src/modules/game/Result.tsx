import React, { useEffect, useMemo, useState } from 'react';
import { FinalRankingItem } from '../../types';

interface ResultProps {
  finalRankings: FinalRankingItem[];
  totalRounds: number;
  onRestart: () => void;
  onBackToHome: () => void;
}

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        color: '#FFD700',
        bg: 'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 215, 0, 0.1))',
        border: '2px solid #FFD700',
        shadow: '0 0 40px rgba(255, 215, 0, 0.5)',
        emoji: '🥇',
      };
    case 2:
      return {
        color: '#C0C0C0',
        bg: 'linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(192, 192, 192, 0.08))',
        border: '2px solid #C0C0C0',
        shadow: '0 0 30px rgba(192, 192, 192, 0.4)',
        emoji: '🥈',
      };
    case 3:
      return {
        color: '#CD7F32',
        bg: 'linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(205, 127, 50, 0.08))',
        border: '2px solid #CD7F32',
        shadow: '0 0 25px rgba(205, 127, 50, 0.35)',
        emoji: '🥉',
      };
    default:
      return {
        color: '#6B6B80',
        bg: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(107, 107, 128, 0.3)',
        shadow: 'none',
        emoji: '',
      };
  }
};

const lineColors = [
  '#00D4FF',
  '#FF007F',
  '#FFD700',
  '#00FF88',
  '#FF9F43',
  '#A855F7',
  '#FF6B81',
  '#48DBFB',
];

const Result: React.FC<ResultProps> = ({
  finalRankings,
  totalRounds,
  onRestart,
  onBackToHome,
}) => {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 6 + Math.random() * 8,
      size: 4 + Math.random() * 8,
    }))
  );
  const [hoverPoint, setHoverPoint] = useState<{
    playerIdx: number;
    round: number;
    score: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    try {
      const AudioCtx =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const melody = [
        { n: 523.25, t: 0 },
        { n: 659.25, t: 0.15 },
        { n: 783.99, t: 0.3 },
        { n: 1046.5, t: 0.45 },
        { n: 1318.51, t: 0.6 },
        { n: 1567.98, t: 0.75 },
      ];
      melody.forEach(({ n, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = n;
        gain.gain.setValueAtTime(0, ctx.currentTime + t);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + t + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + t + 0.35);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.4);
      });
      setTimeout(() => ctx.close(), 2000);
    } catch (_) {}
  }, []);

  const chartData = useMemo(() => {
    const width = 600;
    const height = 280;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const allScores = finalRankings.flatMap((p) => p.round_scores);
    const maxScore = Math.max(100, ...allScores);
    const pointsPerPlayer = finalRankings.map((player, pi) => {
      return player.round_scores.map((score, ri) => {
        const x = padding.left + (chartW * ri) / Math.max(1, totalRounds - 1);
        const y = padding.top + chartH - (chartH * score) / maxScore;
        return { x, y, score, round: ri + 1 };
      });
    });
    return { width, height, padding, chartW, chartH, maxScore, pointsPerPlayer };
  }, [finalRankings, totalRounds]);

  const champion = finalRankings[0];

  return (
    <div className="relative w-full h-full overflow-auto">
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{ overflow: 'hidden' }}
      >
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: 0,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background:
                p.id % 3 === 0
                  ? '#FFD700'
                  : p.id % 3 === 1
                  ? '#00D4FF'
                  : '#FF007F',
              opacity: 0.7,
              animation: `particleFall ${p.duration}s linear ${p.delay}s infinite`,
              boxShadow: `0 0 10px currentColor`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-4 md:p-8 max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h1
            className="text-4xl md:text-6xl font-black mb-4"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              background: 'linear-gradient(90deg, #FFD700, #00D4FF, #FF007F, #FFD700)',
              backgroundSize: '300% 100%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'slideIn 0.8s ease-out',
            }}
          >
            🏆 游戏结束 🏆
          </h1>
          <p className="text-lg md:text-xl" style={{ color: '#B0A8C0' }}>
            经过 {totalRounds} 轮激烈角逐，总冠军诞生！
          </p>
        </div>

        {champion && (
          <div
            className="card p-6 md:p-10 mb-8 text-center mx-auto max-w-md"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(26, 10, 46, 0.95))',
              border: '2px solid #FFD700',
              boxShadow: '0 0 60px rgba(255, 215, 0, 0.4)',
            }}
          >
            <div
              className="text-5xl md:text-7xl mb-4"
              style={{
                animation: 'crownGlow 3s ease-in-out infinite',
              }}
            >
              👑
            </div>
            <div
              className="w-24 h-24 md:w-32 md:h-32 rounded-full mx-auto mb-4 flex items-center justify-center text-5xl md:text-6xl"
              style={{
                background: champion.avatar_bg,
                border: '4px solid #FFD700',
                boxShadow: '0 0 40px rgba(255, 215, 0, 0.6)',
                animation: 'victoryFanfare 1.2s ease-in-out infinite',
              }}
            >
              {champion.avatar}
            </div>
            <p
              className="text-3xl md:text-4xl font-black mb-2"
              style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255, 215, 0, 0.6)' }}
            >
              {champion.name}
            </p>
            <p className="text-lg mb-3" style={{ color: '#B0A8C0' }}>
              总冠军
            </p>
            <p
              className="text-4xl md:text-5xl font-black"
              style={{
                fontFamily: 'Orbitron, monospace',
                color: '#FFFFFF',
                textShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
              }}
            >
              {champion.total_score}
              <span className="text-xl" style={{ color: '#B0A8C0', marginLeft: '8px' }}>
                分
              </span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-10">
          {finalRankings.slice(0, 4).map((r, idx) => {
            const style = getRankStyle(r.rank);
            return (
              <div
                key={r.player_id}
                className="card p-4 md:p-5 text-center"
                style={{
                  background: style.bg,
                  border: style.border,
                  boxShadow: style.shadow,
                  animation: `scorePop 0.6s ease-out ${0.3 + idx * 0.15}s both`,
                }}
              >
                <div className="text-2xl md:text-3xl mb-2">{style.emoji}</div>
                <div
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl md:text-3xl"
                  style={{ background: r.avatar_bg, border: `2px solid ${style.color}` }}
                >
                  {r.avatar}
                </div>
                <p className="font-bold truncate mb-1" style={{ color: style.color }}>
                  {r.name}
                </p>
                <p
                  className="text-xl md:text-2xl font-black"
                  style={{ fontFamily: 'Orbitron, monospace', color: style.color }}
                >
                  {r.total_score}
                </p>
              </div>
            );
          })}
        </div>

        <div className="card p-4 md:p-6 mb-8">
          <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 neon-text">
            📊 得分趋势
          </h3>
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartData.width} ${chartData.height}`}
              className="w-full"
              style={{ minWidth: '400px' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const y =
                  chartData.padding.top +
                  (chartData.chartH * i) / 4;
                const score = Math.round(
                  chartData.maxScore - (chartData.maxScore * i) / 4
                );
                return (
                  <g key={`grid-${i}`}>
                    <line
                      x1={chartData.padding.left}
                      y1={y}
                      x2={chartData.width - chartData.padding.right}
                      y2={y}
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={chartData.padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="#6B6B80"
                    >
                      {score}
                    </text>
                  </g>
                );
              })}
              {Array.from({ length: totalRounds }).map((_, i) => {
                const x =
                  chartData.padding.left +
                  (chartData.chartW * i) / Math.max(1, totalRounds - 1);
                return (
                  <g key={`xlabel-${i}`}>
                    <line
                      x1={x}
                      y1={chartData.height - chartData.padding.bottom}
                      x2={x}
                      y2={chartData.height - chartData.padding.bottom + 6}
                      stroke="#6B6B80"
                    />
                    <text
                      x={x}
                      y={chartData.height - chartData.padding.bottom + 22}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#B0A8C0"
                    >
                      第{i + 1}轮
                    </text>
                  </g>
                );
              })}
              {chartData.pointsPerPlayer.map((points, pi) => {
                const color = lineColors[pi % lineColors.length];
                const pathD = points
                  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                  .join(' ');
                return (
                  <g key={`line-${pi}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        filter: `drop-shadow(0 0 6px ${color}88)`,
                        strokeDasharray: '1000',
                        strokeDashoffset: '1000',
                        animation: `drawLine 1.5s ease-out ${1 + pi * 0.2}s forwards`,
                      }}
                    />
                    {points.map((p, ri) => (
                      <circle
                        key={`pt-${pi}-${ri}`}
                        cx={p.x}
                        cy={p.y}
                        r={6}
                        fill={color}
                        stroke="#1A0A2E"
                        strokeWidth="2"
                        style={{
                          cursor: 'pointer',
                          opacity: 0,
                          animation: `scorePop 0.4s ease-out ${
                            1.5 + pi * 0.2 + ri * 0.1
                          }s forwards`,
                        }}
                        onMouseEnter={() =>
                          setHoverPoint({
                            playerIdx: pi,
                            round: p.round,
                            score: p.score,
                            x: p.x,
                            y: p.y,
                          })
                        }
                        onMouseLeave={() => setHoverPoint(null)}
                      />
                    ))}
                  </g>
                );
              })}
              <style>{`
                @keyframes drawLine {
                  to { stroke-dashoffset: 0; }
                }
              `}</style>
            </svg>
            {hoverPoint && (
              <div
                className="absolute pointer-events-none px-3 py-2 rounded-lg text-sm font-bold z-20"
                style={{
                  left: `${(hoverPoint.x / chartData.width) * 100}%`,
                  top: `${(hoverPoint.y / chartData.height) * 100}%`,
                  transform: 'translate(-50%, -130%)',
                  background: 'rgba(26, 10, 46, 0.95)',
                  border: `2px solid ${lineColors[hoverPoint.playerIdx % lineColors.length]}`,
                  color: '#FFFFFF',
                  boxShadow: `0 0 20px ${lineColors[hoverPoint.playerIdx % lineColors.length]}66`,
                }}
              >
                第{hoverPoint.round}轮: {hoverPoint.score.toFixed(0)}分
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mt-6 justify-center">
            {finalRankings.map((p, idx) => (
              <div key={`legend-${p.player_id}`} className="flex items-center gap-2">
                <div
                  style={{
                    width: '16px',
                    height: '3px',
                    background: lineColors[idx % lineColors.length],
                    boxShadow: `0 0 6px ${lineColors[idx % lineColors.length]}`,
                  }}
                />
                <span className="text-xs md:text-sm" style={{ color: '#B0A8C0' }}>
                  <span className="mr-1">{p.avatar}</span>
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {finalRankings.length > 4 && (
          <div className="card p-4 md:p-6 mb-8">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#B0A8C0' }}>
              全部排名
            </h3>
            <div className="space-y-2">
              {finalRankings.slice(4).map((r) => (
                <div
                  key={r.player_id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <span
                    className="w-8 text-center font-bold"
                    style={{ color: '#6B6B80', fontFamily: 'Orbitron, monospace' }}
                  >
                    {r.rank}
                  </span>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background: r.avatar_bg }}
                  >
                    {r.avatar}
                  </div>
                  <span className="flex-1 truncate" style={{ color: '#FFFFFF' }}>
                    {r.name}
                  </span>
                  <span
                    className="font-bold"
                    style={{
                      fontFamily: 'Orbitron, monospace',
                      color: '#B0A8C0',
                    }}
                  >
                    {r.total_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button onClick={onRestart} className="btn btn-primary text-lg px-10 py-4">
            🔄 再来一局
          </button>
          <button onClick={onBackToHome} className="btn btn-secondary text-lg px-10 py-4">
            🏠 返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default Result;
