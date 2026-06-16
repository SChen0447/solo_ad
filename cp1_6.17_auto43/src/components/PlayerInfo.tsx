import React from 'react';
import { PlayerState } from '../game/GameManager';

interface PlayerInfoProps {
  player: PlayerState;
  isOpponent?: boolean;
  isTargetable?: boolean;
  isHit?: boolean;
  isDefending?: boolean;
  isHealing?: boolean;
  onClick?: () => void;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({
  player,
  isOpponent = false,
  isTargetable = false,
  isHit = false,
  isDefending = false,
  isHealing = false,
  onClick
}) => {
  const hpPercent = (player.hp / player.maxHp) * 100;
  
  const getHpGradient = () => {
    if (hpPercent > 60) {
      return 'linear-gradient(90deg, #00C853, #69F0AE)';
    } else if (hpPercent > 30) {
      return 'linear-gradient(90deg, #FFC107, #FFEB3B)';
    } else {
      return 'linear-gradient(90deg, #FF4C4C, #FF8A80)';
    }
  };
  
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: 'rgba(31, 40, 51, 0.9)',
    borderRadius: '12px',
    border: isTargetable ? '3px solid #FFD700' : '2px solid #2d3748',
    boxShadow: isTargetable 
      ? '0 0 20px rgba(255, 215, 0, 0.4)' 
      : '0 4px 12px rgba(0,0,0,0.3)',
    cursor: isTargetable && onClick ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    minWidth: '280px'
  };
  
  const avatarStyle: React.CSSProperties = {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #4a5568, #2d3748)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    border: '3px solid #4a5568',
    flexShrink: 0,
    position: 'relative',
    boxShadow: isHit ? '0 0 20px #FF4C4C' : 'none',
    animation: isHit ? 'shake 0.4s ease-in-out' : 'none'
  };
  
  const infoStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0
  };
  
  const nameStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };
  
  const hpBarContainer: React.CSSProperties = {
    width: '200px',
    height: '20px',
    background: '#1a202c',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '2px solid #2d3748',
    position: 'relative'
  };
  
  const hpBar: React.CSSProperties = {
    height: '100%',
    width: `${hpPercent}%`,
    background: getHpGradient(),
    transition: 'width 0.5s ease, background 0.5s ease',
    borderRadius: '8px'
  };
  
  const hpText: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    zIndex: 1
  };
  
  const statsRow: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  };
  
  const statItem: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#a0aec0',
    fontSize: '13px'
  };
  
  const energyContainer: React.CSSProperties = {
    display: 'flex',
    gap: '4px'
  };
  
  const energyOrb = (filled: boolean): React.CSSProperties => ({
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: filled 
      ? 'radial-gradient(circle at 30% 30%, #FFD700, #FFA500)' 
      : '#2d3748',
    border: filled ? '2px solid #FFD700' : '2px solid #4a5568',
    boxShadow: filled ? '0 0 8px rgba(255, 215, 0, 0.6)' : 'none',
    transition: 'all 0.3s ease'
  });
  
  const defenseShield: React.CSSProperties = {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(76,175,80,0.8), rgba(76,175,80,0.2))',
    display: isDefending ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    animation: 'pulse 1s ease-in-out infinite',
    border: '2px solid #4CAF50'
  };
  
  const hitOverlay: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle, rgba(255,76,76,0.3) 0%, transparent 70%)',
    opacity: isHit ? 1 : 0,
    transition: 'opacity 0.2s ease',
    pointerEvents: 'none'
  };
  
  const healingParticles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden'
  };
  
  return (
    <div
      style={containerStyle}
      onClick={isTargetable && onClick ? onClick : undefined}
      className={`player-info ${isOpponent ? 'opponent' : 'me'} ${isTargetable ? 'targetable' : ''}`}
    >
      {hitOverlay && <div style={hitOverlay} />}
      
      {isHealing && (
        <div style={healingParticles} className="healing-particles">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                bottom: '20%',
                left: `${20 + i * 15}%`,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#00C853',
                boxShadow: '0 0 6px #00C853',
                animation: `floatUp 0.8s ease-out ${i * 0.1}s forwards`,
                opacity: 0
              }}
            />
          ))}
        </div>
      )}
      
      {!isOpponent && (
        <div style={avatarStyle}>
          {player.avatar}
          <div style={defenseShield}>🛡️</div>
        </div>
      )}
      
      <div style={infoStyle}>
        <h3 style={nameStyle}>{player.nickname}</h3>
        
        <div style={hpBarContainer}>
          <div style={hpText}>{player.hp} / {player.maxHp}</div>
          <div style={hpBar} />
        </div>
        
        <div style={statsRow}>
          <div style={statItem}>
            <span>🎴</span>
            <span>{player.handSize} 张手牌</span>
          </div>
          <div style={{ ...statItem, display: 'flex', alignItems: 'center' }}>
            <span>⚡</span>
            <div style={energyContainer}>
              {[...Array(player.maxEnergy)].map((_, i) => (
                <div key={i} style={energyOrb(i < player.energy)} />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {isOpponent && (
        <div style={avatarStyle}>
          {player.avatar}
          <div style={defenseShield}>🛡️</div>
        </div>
      )}
    </div>
  );
};

export default PlayerInfo;
