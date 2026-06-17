import React, { useState, useEffect, useRef } from 'react';
import { PlayerInfo, RoundLog } from '../types';

interface ScorePanelProps {
  players: PlayerInfo[];
  roundLogs: RoundLog[];
  lastScoreChangeId?: string | null;
}

function ScoreItem({ player, rank, shouldAnimate }: { player: PlayerInfo; rank: number; shouldAnimate: boolean }) {
  const [showAnim, setShowAnim] = useState(false);
  const prevScoreRef = useRef(player.score);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current);
    }

    if (shouldAnimate && player.score > prevScoreRef.current) {
      setShowAnim(true);
      animTimeoutRef.current = setTimeout(() => {
        setShowAnim(false);
      }, 350);
      prevScoreRef.current = player.score;
    }

    return () => {
      if (animTimeoutRef.current) {
        clearTimeout(animTimeoutRef.current);
      }
    };
  }, [shouldAnimate, player.score]);

  return (
    <div
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
          className="score-gold-glow"
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 12,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      <div style={{
        fontSize: 14, fontWeight: 800, width: 24, textAlign: 'center',
        color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#aaa',
        flexShrink: 0,
        zIndex: 1,
      }}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
      </div>
      <div
        className={showAnim ? 'avatar-pop' : ''}
        style={{
          width: 36, height: 36, borderRadius: '50%', background: player.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flexShrink: 0,
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 1,
        }}
      >
        {player.nickname.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#2D3436',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {player.nickname}
          {player.isHost && <span style={{ color: '#FFD700', marginLeft: 4, fontSize: 10 }}>★</span>}
        </div>
      </div>
      <div
        className={showAnim ? 'score-pop' : ''}
        style={{
          fontSize: 22, fontWeight: 800,
          color: showAnim ? '#FFD700' : '#4ECDC4',
          transition: 'color 0.3s ease',
          fontFamily: 'Poppins, sans-serif',
          minWidth: 32,
          textAlign: 'right',
          zIndex: 1,
          textShadow: showAnim ? '0 0 12px rgba(255,215,0,0.6)' : 'none',
        }}
      >
        {player.score}
      </div>
    </div>
  );
}

export default function ScorePanel({ players, roundLogs, lastScoreChangeId }: ScorePanelProps) {
  const [animQueue, setAnimQueue] = useState<string[]>([]);
  const [currentAnimPlayer, setCurrentAnimPlayer] = useState<string | null>(null);
  const prevPlayersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const newScores = new Map<string, number>();
    const changed: string[] = [];

    players.forEach(p => {
      const prevScore = prevPlayersRef.current.get(p.id) || 0;
      newScores.set(p.id, p.score);
      if (p.score > prevScore) {
        changed.push(p.id);
      }
    });

    prevPlayersRef.current = newScores;

    if (changed.length > 0) {
      setAnimQueue(prev => [...prev, ...changed]);
    }
  }, [players]);

  useEffect(() => {
    if (animQueue.length === 0 || currentAnimPlayer) return;

    const next = animQueue[0];
    setAnimQueue(prev => prev.slice(1));
    setCurrentAnimPlayer(next);

    const timer = setTimeout(() => {
      setCurrentAnimPlayer(null);
    }, 150);

    return () => clearTimeout(timer);
  }, [animQueue, currentAnimPlayer]);

  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="score-panel-bg" style={{
      height: '100%',
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      minHeight: 'calc(100vh - 160px)',
      position: 'relative',
    }}>
      <div style={{
        fontSize: 16, fontWeight: 800, color: '#2D3436', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 8,
        textShadow: '0 1px 0 rgba(255,255,255,0.5)',
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
            shouldAnimate={currentAnimPlayer === p.id}
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
