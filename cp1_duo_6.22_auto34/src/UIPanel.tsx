import React, { useEffect, useRef, useState } from 'react';
import { GameState, UNIT_CONFIGS, UnitType, Side } from './GameEngine';

interface UIPanelProps {
  state: GameState;
  onEndTurn: () => void;
  onRestart: () => void;
}

export const UIPanel: React.FC<UIPanelProps> = ({ state, onEndTurn, onRestart }) => {
  const turnRef = useRef<HTMLDivElement>(null);
  const [displayTurn, setDisplayTurn] = useState('');
  const [turnFadeIn, setTurnFadeIn] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const prevTurnRef = useRef(state.turn);
  const prevSideRef = useRef(state.currentSide);

  useEffect(() => {
    if (prevTurnRef.current !== state.turn || prevSideRef.current !== state.currentSide) {
      prevTurnRef.current = state.turn;
      prevSideRef.current = state.currentSide;
      setTurnFadeIn(true);
      setTimeout(() => setTurnFadeIn(false), 1500);
    }
  }, [state.turn, state.currentSide]);

  useEffect(() => {
    const target = `第 ${state.turn} 回合`;
    setDisplayTurn('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayTurn(target.slice(0, i));
      if (i >= target.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, [state.turn]);

  const attackerCount = state.units.filter(u => u.side === 'attacker' && u.hp > 0).length;
  const defenderCount = state.units.filter(u => u.side === 'defender' && u.hp > 0).length;

  const sideLabel = state.currentSide === 'attacker' ? '攻方行动' : '守方行动';
  const sideColor = state.currentSide === 'attacker' ? '#b03020' : '#3060a0';

  const gatePercent = (state.gateHp / state.gateMaxHp) * 100;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      width: 320,
      padding: 16,
      background: 'linear-gradient(180deg, #e8c89a 0%, #d4a574 100%)',
      border: '4px solid #5c3a21',
      borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 0 30px rgba(92,58,33,0.15)',
      color: '#3a2010',
      maxHeight: '100vh',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: -4,
          right: -4,
          padding: '8px 14px',
          background: 'linear-gradient(135deg, #8b6a3a 0%, #5c3a21 100%)',
          color: '#f0d8a8',
          border: '2px solid #3a2010',
          borderRadius: 6,
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          fontSize: 18,
          boxShadow: '2px 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          minWidth: 90,
          textAlign: 'center',
        }}>
          {displayTurn}
          <span style={{ opacity: 0 }}>|</span>
        </div>

        <div style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: '#5c3a21',
          textAlign: 'center',
          padding: '12px 8px',
          marginBottom: 8,
          letterSpacing: 2,
          borderBottom: '2px dashed #8b6a3a',
        }}>
          ⚔️ 城堡攻防推演 ⚔️
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <MoraleBar
          label="攻方士气"
          value={state.attackerMorale}
          color="#c0392b"
          gradient="linear-gradient(90deg, #e74c3c, #c0392b, #922b21)"
          count={attackerCount}
        />
        <MoraleBar
          label="守方士气"
          value={state.defenderMorale}
          color="#2980b9"
          gradient="linear-gradient(90deg, #3498db, #2980b9, #1f618d)"
          count={defenderCount}
        />
      </div>

      <div style={{
        padding: 12,
        background: 'rgba(139,106,58,0.15)',
        border: '2px solid #8b6a3a',
        borderRadius: 6,
      }}>
        <div style={{
          fontSize: 13,
          color: '#5c3a21',
          marginBottom: 6,
          fontWeight: 'bold',
        }}>
          🏰 城门耐久度：{state.gateHp} / {state.gateMaxHp}
        </div>
        <div style={{
          height: 12,
          backgroundColor: '#3a2010',
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid #2a1508',
        }}>
          <div style={{
            height: '100%',
            width: `${gatePercent}%`,
            background: gatePercent > 50
              ? 'linear-gradient(90deg, #d4a017, #b8860b)'
              : gatePercent > 25
              ? 'linear-gradient(90deg, #e67e22, #d35400)'
              : 'linear-gradient(90deg, #c0392b, #922b21)',
            transition: 'width 0.5s ease',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
          }} />
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 6,
        background: `linear-gradient(135deg, ${sideColor}22, ${sideColor}44)`,
        border: `2px solid ${sideColor}`,
      }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: sideColor,
          boxShadow: `0 0 8px ${sideColor}`,
          animation: 'pulse 1.5s infinite',
        }} />
        <div style={{
          fontWeight: 'bold',
          color: sideColor,
          fontSize: 16,
        }}>
          {sideLabel}
        </div>
      </div>

      {turnFadeIn && state.phase !== 'ended' && (
        <div style={{
          textAlign: 'center',
          padding: 10,
          background: 'rgba(92,58,33,0.8)',
          color: '#f0d8a8',
          borderRadius: 6,
          fontWeight: 'bold',
          animation: 'fadeInOut 1.5s ease-in-out',
          fontSize: 15,
        }}>
          {state.currentSide === 'attacker'
            ? `⚔️ 第 ${state.turn} 回合 · 攻方出击！`
            : `🛡️ 第 ${state.turn} 回合 · 守方迎敌！`}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: 10,
      }}>
        <MetalButton
          onClick={onEndTurn}
          disabled={state.phase === 'ended'}
          label="结束回合"
          color="#8b4513"
        />
        <MetalButton
          onClick={onRestart}
          label="重新开始"
          color="#5c3a21"
        />
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        border: '2px solid #5c3a21',
        borderRadius: 6,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.1)',
      }}>
        <div style={{
          padding: '8px 12px',
          background: 'linear-gradient(180deg, #5c3a21, #3a2010)',
          color: '#f0d8a8',
          fontWeight: 'bold',
          fontSize: 14,
          borderBottom: '2px solid #2a1508',
        }}>
          📜 战斗日志
        </div>
        <div
          ref={logContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 8,
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {state.logs.map((log, idx) => {
            const prefix = log.side === 'attacker' ? '🔴' : '🔵';
            const logColor = log.side === 'attacker' ? '#8b2020' : '#204080';
            let text = '';
            if (log.unitName === '系统') {
              if (idx === 0) {
                text = `⚔️ 战斗开始！第 ${log.turn} 回合`;
              } else {
                text = `—— 第 ${log.turn} 回合 ${log.side === 'attacker' ? '攻方' : '守方'}行动 ——`;
              }
            } else if (log.actionType === 'move') {
              text = `${log.unitName} 移动至 (${log.to?.x},${log.to?.y})`;
            } else if (log.actionType === 'attack') {
              if (log.targetName === '城门') {
                text = `${log.unitName} 攻击城门，造成 ${log.damage} 点伤害`;
              } else if (log.damage === 0 && log.unitName !== '系统') {
                text = `💀 ${log.unitName} 被击败！`;
              } else {
                text = `${log.unitName} → ${log.targetName}，-${log.damage} HP`;
              }
            }

            const isSection = log.unitName === '系统' && idx !== 0;
            const isStart = idx === state.logs.length - 1;

            return (
              <div
                key={log.id}
                style={{
                  padding: isSection || isStart ? '6px 8px' : '3px 8px',
                  marginBottom: 2,
                  borderRadius: 4,
                  background: isSection
                    ? 'linear-gradient(90deg, transparent, rgba(92,58,33,0.3), transparent)'
                    : 'transparent',
                  color: isSection ? '#5c3a21' : logColor,
                  fontWeight: isSection ? 'bold' : 'normal',
                  textAlign: isSection ? 'center' : 'left',
                  fontSize: isSection ? 12 : 12,
                  borderLeft: isSection ? 'none' : `3px solid ${log.side === 'attacker' ? '#c0392b' : '#2980b9'}`,
                }}
              >
                {!isSection && <span style={{ marginRight: 4 }}>{prefix}</span>}
                {text}
              </div>
            );
          })}
        </div>
      </div>

      <UnitLegend />

      {state.phase === 'ended' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(20,10,5,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.5s ease',
        }}>
          <div style={{
            padding: 40,
            background: 'linear-gradient(180deg, #e8c89a 0%, #c99860 100%)',
            border: '6px solid #5c3a21',
            borderRadius: 12,
            textAlign: 'center',
            boxShadow: '0 10px 50px rgba(0,0,0,0.6), inset 0 0 40px rgba(92,58,33,0.2)',
            maxWidth: 400,
          }}>
            <div style={{
              fontSize: 48,
              marginBottom: 16,
            }}>
              {state.winner === 'attacker' ? '🏆' : '🛡️'}
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: state.winner === 'attacker' ? '#922b21' : '#1f618d',
              marginBottom: 12,
            }}>
              {state.winner === 'attacker' ? '攻方胜利！' : '守方胜利！'}
            </div>
            <div style={{
              fontSize: 16,
              color: '#5c3a21',
              marginBottom: 24,
              lineHeight: 1.6,
            }}>
              {state.winReason}
            </div>
            <div style={{
              fontSize: 13,
              color: '#8b6a3a',
              marginBottom: 20,
            }}>
              第 {state.turn} 回合结束 · 攻方剩余 {attackerCount} 单位 · 守方剩余 {defenderCount} 单位
            </div>
            <MetalButton
              onClick={onRestart}
              label="再战一局"
              color={state.winner === 'attacker' ? '#8b2020' : '#204080'}
              size="large"
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(10px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        @keyframes wave {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

interface MoraleBarProps {
  label: string;
  value: number;
  color: string;
  gradient: string;
  count: number;
}

const MoraleBar: React.FC<MoraleBarProps> = ({ label, value, color, gradient, count }) => {
  const [prevValue, setPrevValue] = useState(value);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (prevValue !== value) {
      setAnimate(true);
      setPrevValue(value);
      const t = setTimeout(() => setAnimate(false), 500);
      return () => clearTimeout(t);
    }
  }, [value, prevValue]);

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 4,
        fontSize: 13,
        fontWeight: 'bold',
        color: '#5c3a21',
      }}>
        <span>{label}</span>
        <span style={{ color }}>
          {value}% · 存活 {count}
        </span>
      </div>
      <div style={{
        height: 16,
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(92,58,33,0.5)',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: animate
            ? `${gradient}, repeating-linear-gradient(90deg, transparent 0px, transparent 6px, rgba(255,255,255,0.25) 6px, rgba(255,255,255,0.25) 12px)`
            : gradient,
          backgroundSize: animate ? '200% 200%, 100% 100%' : '100% 100%',
          transition: 'width 0.5s ease',
          animation: animate ? 'wave 0.5s linear' : undefined,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
        }} />
      </div>
    </div>
  );
};

interface MetalButtonProps {
  onClick: () => void;
  label: string;
  color: string;
  disabled?: boolean;
  size?: 'normal' | 'large';
}

const MetalButton: React.FC<MetalButtonProps> = ({ onClick, label, color, disabled, size }) => {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const sz = size === 'large' ? { padding: '14px 28px', fontSize: 17 } : { padding: '10px 16px', fontSize: 14 };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        ...sz,
        flex: 1,
        background: disabled
          ? 'linear-gradient(180deg, #8a7a6a, #6a5a4a)'
          : pressed
          ? `linear-gradient(180deg, ${color}, ${shade(color, -20)})`
          : hover
          ? `linear-gradient(180deg, ${shade(color, 15)}, ${shade(color, -5)})`
          : `linear-gradient(180deg, ${shade(color, 25)}, ${color})`,
        color: '#f0d8a8',
        border: `2px solid ${shade(color, -30)}`,
        borderRadius: 6,
        fontWeight: 'bold',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'Georgia, serif',
        boxShadow: pressed
          ? `inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 ${shade(color, 20)}`
          : disabled
          ? 'none'
          : `inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(0,0,0,0.2)`,
        textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
        letterSpacing: 1,
        transition: 'all 0.1s ease',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
};

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

const UnitLegend: React.FC = () => {
  const items: { type: UnitType; side: Side }[] = [
    { type: 'infantry', side: 'attacker' },
    { type: 'archer', side: 'attacker' },
    { type: 'catapult', side: 'attacker' },
    { type: 'knight', side: 'defender' },
    { type: 'archer', side: 'defender' },
    { type: 'trebuchet', side: 'defender' },
  ];

  return (
    <div style={{
      padding: 8,
      background: 'rgba(255,255,255,0.08)',
      border: '1px dashed #8b6a3a',
      borderRadius: 6,
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 'bold',
        color: '#5c3a21',
        marginBottom: 6,
      }}>
        📖 单位图鉴
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 4,
      }}>
        {items.map((it, i) => {
          const cfg = UNIT_CONFIGS[it.type];
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              padding: '3px 4px',
              background: it.side === 'attacker' ? 'rgba(180,60,40,0.12)' : 'rgba(60,100,160,0.12)',
              borderRadius: 3,
              borderLeft: `3px solid ${it.side === 'attacker' ? '#c0392b' : '#2980b9'}`,
            }}>
              <span style={{ fontSize: 14 }}>{cfg.icon}</span>
              <div style={{ color: '#3a2010' }}>
                <div style={{ fontWeight: 'bold' }}>{cfg.name}</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>
                  HP{cfg.hp} ATK{cfg.attack} R{cfg.range}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
