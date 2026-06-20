import React, { useEffect, useState } from 'react';
import { gameEngine } from '../game/GameEngine';

const ScoreBoard: React.FC = () => {
  const [, forceUpdate] = useState(0);
  const [prevCounts, setPrevCounts] = useState<Record<string, number>>({});
  const [animatingPlayers, setAnimatingPlayers] = useState<Set<string>>(new Set());
  const [prevTurn, setPrevTurn] = useState(1);
  const [turnAnimating, setTurnAnimating] = useState(false);

  useEffect(() => {
    return gameEngine.subscribe(() => {
      const state = gameEngine.getState();
      const newCounts: Record<string, number> = {};
      Object.values(state.players).forEach((p) => {
        newCounts[p.id] = p.territories;
      });
      const changed = new Set<string>();
      Object.keys(newCounts).forEach((pid) => {
        if (prevCounts[pid] !== undefined && prevCounts[pid] !== newCounts[pid]) {
          changed.add(pid);
        }
      });
      if (changed.size > 0) {
        setAnimatingPlayers(changed);
        setTimeout(() => setAnimatingPlayers(new Set()), 200);
      }
      setPrevCounts(newCounts);

      if (prevTurn !== state.turn) {
        setTurnAnimating(true);
        setTimeout(() => setTurnAnimating(false), 200);
        setPrevTurn(state.turn);
      }

      forceUpdate((v) => v + 1);
    });
  }, []);

  const state = gameEngine.getState();
  const currentPlayerId = gameEngine.getCurrentPlayerId();
  const players = Object.values(state.players).sort((a, b) => b.territories - a.territories);

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: 20,
        zIndex: 100,
        background: 'linear-gradient(135deg, rgba(26,26,46,0.95) 0%, rgba(15,12,41,0.98) 100%)',
        border: '2px solid rgba(212,175,55,0.4)',
        borderRadius: 14,
        padding: '14px 18px',
        minWidth: 220,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(212,175,55,0.08)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          color: '#d4af37',
          fontSize: 13,
          fontWeight: 'bold',
          marginBottom: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(212,175,55,0.2)',
          paddingBottom: 8,
        }}
      >
        <span>🏆 实时得分榜</span>
        <span
          style={{
            color: turnAnimating ? '#fff' : '#d4af37',
            background: turnAnimating
              ? 'linear-gradient(90deg, #d4af37, #f4d03f)'
              : 'rgba(212,175,55,0.15)',
            padding: '2px 10px',
            borderRadius: 10,
            transform: turnAnimating ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.2s ease-out',
            fontSize: 12,
            color: turnAnimating ? '#1a1a2e' : undefined,
          }}
        >
          回合 {state.turn}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {players.length === 0 ? (
          <div style={{ color: '#666', fontSize: 12, padding: '10px 0' }}>等待玩家加入...</div>
        ) : (
          players.map((p, i) => {
            const isCurrent = currentPlayerId === p.id;
            const animating = animatingPlayers.has(p.id);
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 8px',
                  borderRadius: 8,
                  background: isCurrent ? 'rgba(212,175,55,0.12)' : 'transparent',
                  border: isCurrent ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: p.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 'bold',
                    boxShadow: `0 0 10px ${p.color}66`,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1, fontSize: 13, color: '#eee', overflow: 'hidden' }}>
                  <div
                    style={{
                      fontWeight: isCurrent ? 'bold' : 500,
                      color: isCurrent ? '#d4af37' : '#ddd',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.name} {isCurrent && '⏳'}
                  </div>
                  {!p.ready && state.status === 'waiting' && (
                    <div style={{ fontSize: 10, color: '#e74c3c' }}>未就绪</div>
                  )}
                </div>
                <div
                  style={{
                    fontSize: animating ? 22 : 18,
                    fontWeight: 'bold',
                    color: p.color,
                    transform: animating ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    textShadow: animating ? `0 0 15px ${p.color}` : 'none',
                    minWidth: 28,
                    textAlign: 'right',
                  }}
                >
                  {p.territories}
                </div>
              </div>
            );
          })
        )}
      </div>
      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid rgba(212,175,55,0.15)',
          fontSize: 11,
          color: '#777',
        }}
      >
        胜利目标：占领 60% 领地
      </div>
    </div>
  );
};

export default ScoreBoard;
