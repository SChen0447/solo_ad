import React, { useState, useEffect, useRef } from 'react';
import { PlayerInfo, RoundLog } from '../types';

interface ScorePanelProps {
  players: PlayerInfo[];
  roundLogs: RoundLog[];
}

function ScoreItem({ player, rank }: { player: PlayerInfo; rank: number }) {
  const [animating, setAnimating] = useState(false);
  const prevScoreRef = useRef(player.score);

  useEffect(() => {
    if (player.score > prevScoreRef.current) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(timer);
    }
    prevScoreRef.current = player.score;
  }, [player.score]);

  return (
    <div
      className={animating ? 'score-pop' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: rank === 1 ? 'rgba(255,215,0,0.1)' : 'transparent',
        marginBottom: 4,
        transition: 'background 0.3s ease',
      }}
    >
      <div style={{
        fontSize: 14, fontWeight: 800, width: 22, textAlign: 'center',
        color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#aaa',
      }}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
      </div>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: player.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 700, color: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        flexShrink: 0,
      }}>
        {player.nickname.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#2D3436', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.nickname}
        </div>
      </div>
      <div style={{
        fontSize: 18, fontWeight: 800,
        color: animating ? '#FFD700' : '#4ECDC4',
        transition: 'color 0.3s ease',
        fontFamily: 'Poppins, sans-serif',
      }}>
        {player.score}
      </div>
    </div>
  );
}

export default function ScorePanel({ players, roundLogs }: ScorePanelProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="score-panel-bg" style={{
      height: '100%',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid rgba(0,0,0,0.04)',
    }}>
      <div style={{
        fontSize: 16, fontWeight: 800, color: '#2D3436', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        🏆 排行榜
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.map((p, i) => (
          <ScoreItem key={p.id} player={p} rank={i + 1} />
        ))}
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: 20 }}>
          等待玩家加入...
        </div>
      )}
    </div>
  );
}
