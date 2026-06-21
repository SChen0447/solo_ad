import React, { useState, useEffect, useMemo } from 'react';
import { Pet, ActionType, Mood, PET_PRESETS, ACTION_COOLDOWN } from '../types';

interface PetCardProps {
  pet: Pet;
  onAction?: (petId: string, action: ActionType) => void;
  onInteract?: (petId: string) => void;
  isInteractive?: boolean;
  showActions?: boolean;
}

const MOOD_EMOJIS: Record<Mood, string> = {
  happy: '😊',
  hungry: '😋',
  sleepy: '😴',
  bored: '😐',
  sick: '🤒'
};

function PixelCatSVG({ isSleepy }: { isSleepy: boolean }) {
  return (
    <svg width="100" height="100" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="3" y="1" width="2" height="2" fill="#9ca3af"/>
      <rect x="4" y="0" width="2" height="1" fill="#9ca3af"/>
      <rect x="10" y="1" width="2" height="2" fill="#9ca3af"/>
      <rect x="11" y="0" width="2" height="1" fill="#9ca3af"/>
      <rect x="3" y="2" width="10" height="1" fill="#9ca3af"/>
      <rect x="2" y="3" width="12" height="9" fill="#d1d5db"/>
      <rect x="5" y="5" width="2" height={isSleepy ? 1 : 2} fill="#1f2937"/>
      <rect x="9" y="5" width="2" height={isSleepy ? 1 : 2} fill="#1f2937"/>
      <rect x="7" y="7" width="2" height="1" fill="#f472b6"/>
      <rect x="6" y="8" width="1" height="1" fill="#1f2937"/>
      <rect x="9" y="8" width="1" height="1" fill="#1f2937"/>
      <rect x="7" y="9" width="2" height="1" fill="#1f2937"/>
      <rect x="2" y="12" width="3" height="3" fill="#9ca3af"/>
      <rect x="11" y="12" width="3" height="3" fill="#9ca3af"/>
      <rect x="0" y="6" width="2" height="2" fill="#d1d5db"/>
      <rect x="14" y="6" width="2" height="2" fill="#d1d5db"/>
    </svg>
  );
}

function PixelDogSVG({ isSleepy }: { isSleepy: boolean }) {
  return (
    <svg width="100" height="100" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="3" width="3" height="5" fill="#a0522d"/>
      <rect x="11" y="3" width="3" height="5" fill="#a0522d"/>
      <rect x="3" y="2" width="10" height="10" fill="#deb887"/>
      <rect x="5" y="5" width="2" height={isSleepy ? 1 : 2} fill="#1f2937"/>
      <rect x="9" y="5" width="2" height={isSleepy ? 1 : 2} fill="#1f2937"/>
      <rect x="7" y="8" width="2" height="2" fill="#1f2937"/>
      <rect x="6" y="10" width="4" height="1" fill="#ef4444"/>
      <rect x="3" y="12" width="3" height="3" fill="#a0522d"/>
      <rect x="10" y="12" width="3" height="3" fill="#a0522d"/>
    </svg>
  );
}

function PixelDragonSVG({ isSleepy }: { isSleepy: boolean }) {
  return (
    <svg width="100" height="100" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="0" width="2" height="2" fill="#8b5cf6"/>
      <rect x="5" y="0" width="2" height="2" fill="#8b5cf6"/>
      <rect x="9" y="0" width="2" height="2" fill="#8b5cf6"/>
      <rect x="12" y="0" width="2" height="2" fill="#8b5cf6"/>
      <rect x="2" y="2" width="12" height="1" fill="#8b5cf6"/>
      <rect x="1" y="3" width="14" height="9" fill="#a78bfa"/>
      <rect x="4" y="5" width="2" height={isSleepy ? 1 : 2} fill="#fbbf24"/>
      <rect x="10" y="5" width="2" height={isSleepy ? 1 : 2} fill="#fbbf24"/>
      <rect x="7" y="8" width="2" height="1" fill="#ef4444"/>
      <rect x="6" y="9" width="1" height="1" fill="#1f2937"/>
      <rect x="9" y="9" width="1" height="1" fill="#1f2937"/>
      <rect x="1" y="12" width="4" height="3" fill="#8b5cf6"/>
      <rect x="11" y="12" width="4" height="3" fill="#8b5cf6"/>
      <rect x="14" y="7" width="2" height="1" fill="#f97316"/>
      <rect x="15" y="6" width="1" height="3" fill="#ef4444"/>
    </svg>
  );
}

function PixelUnicornSVG({ isSleepy }: { isSleepy: boolean }) {
  return (
    <svg width="100" height="100" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="7" y="0" width="2" height="3" fill="#fbbf24"/>
      <rect x="8" y="0" width="1" height="1" fill="#fef3c7"/>
      <rect x="2" y="3" width="3" height="4" fill="#ec4899"/>
      <rect x="11" y="3" width="3" height="4" fill="#ec4899"/>
      <rect x="3" y="3" width="10" height="9" fill="#f9a8d4"/>
      <rect x="5" y="5" width="2" height={isSleepy ? 1 : 2} fill="#1f2937"/>
      <rect x="9" y="5" width="2" height={isSleepy ? 1 : 2} fill="#1f2937"/>
      <rect x="7" y="7" width="2" height="1" fill="#ec4899"/>
      <rect x="6" y="8" width="1" height="1" fill="#ec4899"/>
      <rect x="9" y="8" width="1" height="1" fill="#ec4899"/>
      <rect x="7" y="9" width="2" height="1" fill="#1f2937"/>
      <rect x="3" y="12" width="3" height="3" fill="#ec4899"/>
      <rect x="10" y="12" width="3" height="3" fill="#ec4899"/>
      <rect x="0" y="7" width="2" height="2" fill="#fce7f3"/>
      <rect x="14" y="7" width="2" height="2" fill="#fce7f3"/>
    </svg>
  );
}

function PixelPenguinSVG({ isSleepy }: { isSleepy: boolean }) {
  return (
    <svg width="100" height="100" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="3" y="1" width="10" height="2" fill="#1e3a5f"/>
      <rect x="2" y="3" width="12" height="9" fill="#1e3a5f"/>
      <rect x="4" y="4" width="8" height="7" fill="#f0f9ff"/>
      <rect x="5" y="5" width="2" height={isSleepy ? 1 : 2} fill="#1f2937"/>
      <rect x="9" y="5" width="2" height={isSleepy ? 1 : 2} fill="#1f2937"/>
      <rect x="7" y="8" width="2" height="2" fill="#f97316"/>
      <rect x="3" y="12" width="4" height="3" fill="#f97316"/>
      <rect x="9" y="12" width="4" height="3" fill="#f97316"/>
      <rect x="1" y="6" width="2" height="3" fill="#1e3a5f"/>
      <rect x="13" y="6" width="2" height="3" fill="#1e3a5f"/>
    </svg>
  );
}

function PixelFoxSVG({ isSleepy }: { isSleepy: boolean }) {
  return (
    <svg width="100" height="100" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="1" y="1" width="3" height="3" fill="#f97316"/>
      <rect x="12" y="1" width="3" height="3" fill="#f97316"/>
      <rect x="2" y="2" width="1" height="2" fill="#fdba74"/>
      <rect x="13" y="2" width="1" height="2" fill="#fdba74"/>
      <rect x="2" y="3" width="12" height="1" fill="#f97316"/>
      <rect x="1" y="4" width="14" height="8" fill="#fdba74"/>
      <rect x="5" y="5" width="2" height={isSleepy ? 1 : 2} fill="#1f2937"/>
      <rect x="9" y="5" width="2" height={isSleepy ? 1 : 2} fill="#1f2937"/>
      <rect x="7" y="8" width="2" height="1" fill="#1f2937"/>
      <rect x="6" y="9" width="4" height="1" fill="#f97316"/>
      <rect x="2" y="12" width="3" height="3" fill="#f97316"/>
      <rect x="11" y="12" width="3" height="3" fill="#f97316"/>
      <rect x="0" y="8" width="2" height="2" fill="#fdba74"/>
      <rect x="14" y="8" width="2" height="2" fill="#fdba74"/>
    </svg>
  );
}

const PET_SVGS = {
  cat: PixelCatSVG,
  dog: PixelDogSVG,
  dragon: PixelDragonSVG,
  unicorn: PixelUnicornSVG,
  penguin: PixelPenguinSVG,
  fox: PixelFoxSVG
};

function ProgressBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
        fontSize: '12px',
        fontWeight: 500,
        color: '#2d3748'
      }}>
        <span>{label}</span>
        <span style={{
          transition: 'all 0.3s ease',
          fontVariantNumeric: 'tabular-nums'
        }}>{Math.round(value)}%</span>
      </div>
      <div style={{
        height: '12px',
        backgroundColor: '#e2e8f0',
        borderRadius: '6px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          backgroundColor: color,
          borderRadius: '6px',
          transition: 'width 0.3s ease',
          boxShadow: `0 1px 2px ${color}40`
        }} />
      </div>
    </div>
  );
}

export default function PetCard({ pet, onAction, onInteract, isInteractive = false, showActions = false }: PetCardProps) {
  const [cooldowns, setCooldowns] = useState<Record<ActionType, boolean>>({ feed: false, play: false, sleep: false });
  const [animState, setAnimState] = useState<{ feed: boolean; play: boolean; sleep: boolean }>({
    feed: false, play: false, sleep: false
  });
  const [isShaking, setIsShaking] = useState(false);

  const preset = useMemo(() => PET_PRESETS.find(p => p.type === pet.type), [pet.type]);
  const PetSVG = PET_SVGS[pet.type];
  const isSleepy = pet.mood === 'sleepy' || animState.sleep;

  const cardColors = useMemo(() => {
    if (pet.isSick) {
      return { from: '#718096', to: '#a0aec0' };
    }
    return preset?.colors || { from: '#8b5cf6', to: '#a78bfa' };
  }, [pet.isSick, preset]);

  const borderColor = pet.stats.hunger < 20 ? '#ef4444' : 'transparent';

  useEffect(() => {
    if (pet.stats.hunger < 20) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [pet.stats.hunger]);

  useEffect(() => {
    const checkCooldowns = () => {
      const now = Date.now();
      setCooldowns({
        feed: now - pet.lastActionTime.feed < ACTION_COOLDOWN,
        play: now - pet.lastActionTime.play < ACTION_COOLDOWN,
        sleep: now - pet.lastActionTime.sleep < ACTION_COOLDOWN
      });
    };

    checkCooldowns();
    const interval = setInterval(checkCooldowns, 100);
    return () => clearInterval(interval);
  }, [pet.lastActionTime]);

  const handleAction = (action: ActionType) => {
    if (cooldowns[action] || pet.isSick) return;
    
    setAnimState(prev => ({ ...prev, [action]: true }));
    
    if (action === 'feed') {
      setTimeout(() => setAnimState(prev => ({ ...prev, feed: false })), 500);
    } else if (action === 'play') {
      setTimeout(() => setAnimState(prev => ({ ...prev, play: false })), 500);
    } else if (action === 'sleep') {
      setTimeout(() => setAnimState(prev => ({ ...prev, sleep: false })), 500);
    }
    
    onAction?.(pet.id, action);
  };

  const handleClick = () => {
    if (isInteractive) {
      onInteract?.(pet.id);
    }
  };

  const cardStyle: React.CSSProperties = {
    width: '280px',
    borderRadius: '16px',
    padding: '20px',
    background: `linear-gradient(135deg, ${cardColors.from}, ${cardColors.to})`,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    cursor: isInteractive ? 'pointer' : 'default',
    border: `3px solid ${borderColor}`,
    animation: isShaking ? 'shake 0.5s ease-in-out' : 'none',
    opacity: animState.sleep ? 0.7 : 1,
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div 
      style={cardStyle}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (isInteractive) {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
    >
      {animState.sleep && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          fontSize: '32px',
          animation: 'float 0.5s ease-in-out infinite alternate'
        }}>
          🌙
        </div>
      )}
      
      {animState.feed && (
        <div style={{
          position: 'absolute',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '28px',
          animation: 'floatUp 0.5s ease-out forwards'
        }}>
          🍖
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        fontSize: '24px',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {MOOD_EMOJIS[pet.mood]}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '120px',
        marginBottom: '16px'
      }}>
        <div style={{
          animation: animState.play ? 'wiggle 0.5s ease-in-out infinite' : 'none',
          transformOrigin: 'center bottom'
        }}>
          <PetSVG isSleepy={isSleepy} />
        </div>
      </div>

      <h3 style={{
        textAlign: 'center',
        margin: '0 0 16px 0',
        color: '#fff',
        fontSize: '20px',
        fontWeight: 600,
        textShadow: '0 1px 2px rgba(0,0,0,0.2)'
      }}>
        {pet.name}
      </h3>

      <div style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: showActions ? '16px' : '0'
      }}>
        <ProgressBar value={pet.stats.hunger} color="#48bb78" label="饱腹度" />
        <ProgressBar value={pet.stats.happiness} color="#ecc94b" label="快乐度" />
        <ProgressBar value={pet.stats.energy} color="#4299e1" label="精力值" />
      </div>

      {showActions && (
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <button
            onClick={() => handleAction('feed')}
            disabled={cooldowns.feed || pet.isSick}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: cooldowns.feed || pet.isSick ? '#a0aec0' : '#48bb78',
              color: '#fff',
              fontWeight: 600,
              cursor: cooldowns.feed || pet.isSick ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              if (!cooldowns.feed && !pet.isSick) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(72,187,120,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🍖 喂食
          </button>
          <button
            onClick={() => handleAction('play')}
            disabled={cooldowns.play || pet.isSick}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: cooldowns.play || pet.isSick ? '#a0aec0' : '#ecc94b',
              color: '#fff',
              fontWeight: 600,
              cursor: cooldowns.play || pet.isSick ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              if (!cooldowns.play && !pet.isSick) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(236,201,75,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🎾 玩耍
          </button>
          <button
            onClick={() => handleAction('sleep')}
            disabled={cooldowns.sleep || pet.isSick}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: cooldowns.sleep || pet.isSick ? '#a0aec0' : '#4299e1',
              color: '#fff',
              fontWeight: 600,
              cursor: cooldowns.sleep || pet.isSick ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              if (!cooldowns.sleep && !pet.isSick) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(66,153,225,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            😴 睡觉
          </button>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        @keyframes floatUp {
          0% { transform: translateX(-50%) translateY(0); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-60px); opacity: 0; }
        }
        @keyframes float {
          0% { transform: translateY(0); }
          100% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
