import React, { useEffect, useState } from 'react';
import { gameEngine } from '../game/GameEngine';

export interface VictoryModalProps {
  onClose: () => void;
}

const VictoryModal: React.FC<VictoryModalProps> = ({ onClose }) => {
  const [visible, setVisible] = useState(false);
  const state = gameEngine.getState();
  const winner = state.winner ? state.players[state.winner] : null;

  useEffect(() => {
    if (winner) {
      requestAnimationFrame(() => setVisible(true));
    }
  }, [winner?.id]);

  if (!winner) return null;

  const isLocalWinner = winner.id === gameEngine.getLocalPlayerId();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000080',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0c29 100%)',
          border: '3px solid #d4af37',
          borderRadius: '24px 24px 0 0',
          padding: '40px 60px',
          marginBottom: 0,
          width: '100%',
          maxWidth: 520,
          textAlign: 'center',
          boxShadow: '0 -10px 60px rgba(212,175,55,0.3)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 200,
            height: 200,
            borderRadius: 100,
            background: `radial-gradient(circle, ${winner.color}44 0%, transparent 70%)`,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            fontSize: 64,
            marginBottom: 12,
            filter: 'drop-shadow(0 4px 20px rgba(212,175,55,0.6))',
            animation: visible ? 'bounce 0.8s ease-out' : 'none',
          }}
        >
          {isLocalWinner ? '🎉' : '🏆'}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#d4af37',
            marginBottom: 8,
            letterSpacing: 4,
            textShadow: '0 0 20px rgba(212,175,55,0.5)',
          }}
        >
          {isLocalWinner ? '你 赢 了 ！' : '游 戏 结 束'}
        </div>
        <div
          style={{
            fontSize: 16,
            color: '#bbb',
            marginBottom: 24,
          }}
        >
          {isLocalWinner
            ? '恭喜你成功征服了战场！'
            : `胜利者是：${winner.name}`}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 32,
            padding: '16px 24px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 14,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              background: winner.color,
              boxShadow: `0 0 30px ${winner.color}88`,
              border: '2px solid #d4af37',
            }}
          />
          <div style={{ textAlign: 'left' }}>
            <div style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>{winner.name}</div>
            <div style={{ color: winner.color, fontSize: 14, marginTop: 2 }}>
              🏅 占领了 <b>{winner.territories}</b> 块领地
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '14px 40px',
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
              transition: 'all 0.2s ease',
              letterSpacing: 2,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 6px 28px rgba(212,175,55,0.6)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                '0 4px 20px rgba(212,175,55,0.4)';
            }}
          >
            返 回 大 厅
          </button>
        </div>
      </div>
      <style>{`
        @keyframes bounce {
          0% { transform: scale(0.3) rotate(-30deg); opacity: 0; }
          50% { transform: scale(1.3) rotate(10deg); }
          70% { transform: scale(0.9) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VictoryModal;
