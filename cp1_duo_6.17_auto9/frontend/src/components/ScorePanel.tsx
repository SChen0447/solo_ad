import React, { useState, useEffect, useRef } from 'react';
import { PlayerInfo, RoundLog } from '../types';

interface ScorePanelProps {
  players: PlayerInfo[];
  roundLogs: RoundLog[];
  lastScoreChangeId?: string | null;
}

function ScoreItem({ player, rank, isAnimating }: { player: PlayerInfo; rank: number; isAnimating: boolean }) {
  const [showAnim, setShowAnim] = useState(false);
  const prevScoreRef = useRef(player.score);

  useEffect(() => {
    if (isAnimating && player.score > prevScoreRef.current) {
      setShowAnim(true);
      const t = setTimeout(() => setShowAnim(false), 300);
      prevScoreRef.current = player.score;
      return () => clearTimeout(t);
    }
    prevScoreRef.current = player.score;
  }, [isAnimating, player.score]);

  return (
    <div
      className={showAnim ? 'score-pop' : ''}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: rank === 1 ? 'rgba(255,215,0,0.12)' : 'transparent',
        marginBottom: 4,
        transition: 'background 0.3s ease',
        position: 'relative',
      }}
    >
      {showAnim && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 10,
            boxShadow: '0 0 18px 4px rgba(255, 215, 0, 0.7)',
            animation: 'pulse-gold 0.3s ease-out',
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{
        fontSize: 14, fontWeight: 800, width: 24, textAlign: 'center',
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
        transition: 'transform 0.3s ease',
        transform: showAnim ? 'scale(1.25)' : 'scale(1)',
      }}>
        {player.nickname.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#2D3436',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {player.nickname}
          {player.isHost && <span style={{ color: '#FFD700', marginLeft: 4, fontSize: 10 }}>★</span>}
        </div>
      </div>
      <div style={{
        fontSize: 20, fontWeight: 800,
        color: showAnim ? '#FFD700' : '#4ECDC4',
        transition: 'color 0.3s ease, transform 0.3s ease',
        fontFamily: 'Poppins, sans-serif',
        transform: showAnim ? 'scale(1.4)' : 'scale(1)',
        minWidth: 28,
        textAlign: 'right',
      }}>
        {player.score}
      </div>
    </div>
  );
}

export default function ScorePanel({ players, roundLogs, lastScoreChangeId }: ScorePanelProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="score-panel-bg" style={{
      height: '100%',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid rgba(0,0,0,0.04)',
      minHeight: 'calc(100vh - 160px)',
    }}>
      <div style={{
        fontSize: 16, fontWeight: 800, color: '#2D3436', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        🏆 实时排行榜
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: '#aaa', fontSize: 13, padding: 20 }}>
            等待玩家加入...
          </div>
        )}
        {sorted.map((p, i) => (
          <ScoreItem
            key={p.id}
            player={p}
            rank={i + 1}
            isAnimating={lastScoreChangeId === p.id}
          />
        ))}
      </div>

      {sorted.length > 0 && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px dashed rgba(0,0,0,0.08)',
          fontSize: 12,
          color: '#888',
          textAlign: 'center',
        }}>
          共 {sorted.length} 位玩家
        </div>
      )}
    </div>
  );
}
