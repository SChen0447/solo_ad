import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pokemon, Skill, typeConfig, calculateDamage } from '../data/pokemonData';

interface BattleArenaProps {
  playerPokemon: Pokemon;
  playerSkill: Skill;
  aiPokemon: Pokemon;
  aiSkill: Skill;
  onBattleEnd: (winner: 'player' | 'ai') => void;
}

type BattlePhase =
  | 'ready'
  | 'player-attack'
  | 'player-hit'
  | 'player-delay'
  | 'ai-attack'
  | 'ai-hit'
  | 'ai-delay'
  | 'check-winner'
  | 'ended';

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  startTime: number;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  playerPokemon,
  playerSkill,
  aiPokemon,
  aiSkill,
  onBattleEnd,
}) => {
  const [playerHp, setPlayerHp] = useState(playerPokemon.hp);
  const [aiHp, setAiHp] = useState(aiPokemon.hp);
  const [playerHpDisplay, setPlayerHpDisplay] = useState(playerPokemon.hp);
  const [aiHpDisplay, setAiHpDisplay] = useState(aiPokemon.hp);

  const [battlePhase, setBattlePhase] = useState<BattlePhase>('ready');
  const [turnCount, setTurnCount] = useState(1);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);

  const [playerHitFlash, setPlayerHitFlash] = useState(false);
  const [aiHitFlash, setAiHitFlash] = useState(false);

  const [playerAttackProgress, setPlayerAttackProgress] = useState(0);
  const [aiAttackProgress, setAiAttackProgress] = useState(0);

  const [playerMiss, setPlayerMiss] = useState(false);
  const [aiMiss, setAiMiss] = useState(false);

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const floatingIdRef = useRef(0);

  const [playerFadeOut, setPlayerFadeOut] = useState(false);
  const [aiFadeOut, setAiFadeOut] = useState(false);
  const [winnerGlow, setWinnerGlow] = useState(false);

  const rafRef = useRef<number | null>(null);
  const phaseTimersRef = useRef<number[]>([]);

  const firstAttacker: 'player' | 'ai' = playerPokemon.speed >= aiPokemon.speed ? 'player' : 'ai';

  const clearAllTimers = useCallback(() => {
    phaseTimersRef.current.forEach((t) => clearTimeout(t));
    phaseTimersRef.current = [];
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const addFloatingText = useCallback((text: string, target: 'player' | 'ai', color: string) => {
    const id = ++floatingIdRef.current;
    setFloatingTexts((prev) => [
      ...prev,
      {
        id,
        text,
        x: target === 'player' ? 30 : 70,
        y: 40,
        color,
        startTime: performance.now(),
      },
    ]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((f) => f.id !== id));
    }, 1000);
  }, []);

  const animateHpBar = useCallback(
    (target: 'player' | 'ai', start: number, end: number, duration: number) => {
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(start + (end - start) * eased);

        if (target === 'player') {
          setPlayerHpDisplay(current);
        } else {
          setAiHpDisplay(current);
        }

        if (t < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    },
    []
  );

  const animateAttack = useCallback(
    (
      attacker: 'player' | 'ai',
      duration: number,
      onComplete: () => void
    ) => {
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);

        let progress: number;
        if (t < 0.5) {
          progress = t * 2;
        } else {
          progress = (1 - t) * 2;
        }
        progress = 1 - Math.pow(1 - progress, 2);

        if (attacker === 'player') {
          setPlayerAttackProgress(progress);
        } else {
          setAiAttackProgress(progress);
        }

        if (t < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          onComplete();
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    },
    []
  );

  useEffect(() => {
    if (battlePhase !== 'ready') return;

    const timer = window.setTimeout(() => {
      if (firstAttacker === 'player') {
        setBattlePhase('player-attack');
      } else {
        setBattlePhase('ai-attack');
      }
    }, 1500);
    phaseTimersRef.current.push(timer);

    return () => clearTimeout(timer);
  }, [battlePhase, firstAttacker]);

  useEffect(() => {
    if (battlePhase === 'player-attack') {
      animateAttack('player', 600, () => {
        const hit = Math.random() * 100 < playerSkill.accuracy;
        if (hit) {
          const { damage, effectiveness } = calculateDamage(playerPokemon, aiPokemon, playerSkill);
          const newAiHp = Math.max(0, aiHp - damage);

          setAiHitFlash(true);
          setTimeout(() => setAiHitFlash(false), 200);

          addFloatingText(`-${damage}`, 'ai', effectiveness === 'super' ? '#ff6b6b' : effectiveness === 'weak' ? '#aaa' : '#ffd43b');

          animateHpBar('ai', aiHp, newAiHp, 1000);
          setAiHp(newAiHp);

          const t = window.setTimeout(() => {
            setBattlePhase('player-delay');
          }, 800);
          phaseTimersRef.current.push(t);
          setBattlePhase('player-hit');
        } else {
          setPlayerMiss(true);
          setTimeout(() => setPlayerMiss(false), 500);
          const t = window.setTimeout(() => {
            setBattlePhase('player-delay');
          }, 800);
          phaseTimersRef.current.push(t);
          setBattlePhase('player-hit');
        }
      });
    }
  }, [battlePhase, playerPokemon, aiPokemon, playerSkill, aiHp, animateAttack, addFloatingText, animateHpBar]);

  useEffect(() => {
    if (battlePhase === 'ai-attack') {
      animateAttack('ai', 600, () => {
        const hit = Math.random() * 100 < aiSkill.accuracy;
        if (hit) {
          const { damage, effectiveness } = calculateDamage(aiPokemon, playerPokemon, aiSkill);
          const newPlayerHp = Math.max(0, playerHp - damage);

          setPlayerHitFlash(true);
          setTimeout(() => setPlayerHitFlash(false), 200);

          addFloatingText(`-${damage}`, 'player', effectiveness === 'super' ? '#ff6b6b' : effectiveness === 'weak' ? '#aaa' : '#ffd43b');

          animateHpBar('player', playerHp, newPlayerHp, 1000);
          setPlayerHp(newPlayerHp);

          const t = window.setTimeout(() => {
            setBattlePhase('ai-delay');
          }, 800);
          phaseTimersRef.current.push(t);
          setBattlePhase('ai-hit');
        } else {
          setAiMiss(true);
          setTimeout(() => setAiMiss(false), 500);
          const t = window.setTimeout(() => {
            setBattlePhase('ai-delay');
          }, 800);
          phaseTimersRef.current.push(t);
          setBattlePhase('ai-hit');
        }
      });
    }
  }, [battlePhase, playerPokemon, aiPokemon, aiSkill, playerHp, animateAttack, addFloatingText, animateHpBar]);

  useEffect(() => {
    if (battlePhase === 'player-delay') {
      const timer = window.setTimeout(() => {
        if (playerHp <= 0 || aiHp <= 0) {
          setBattlePhase('check-winner');
        } else if (firstAttacker === 'player') {
          setBattlePhase('ai-attack');
        } else {
          setTurnCount((t) => t + 1);
          setBattlePhase('player-attack');
        }
      }, 800);
      phaseTimersRef.current.push(timer);
      return () => clearTimeout(timer);
    }
  }, [battlePhase, playerHp, aiHp, firstAttacker]);

  useEffect(() => {
    if (battlePhase === 'ai-delay') {
      const timer = window.setTimeout(() => {
        if (playerHp <= 0 || aiHp <= 0) {
          setBattlePhase('check-winner');
        } else if (firstAttacker === 'ai') {
          setBattlePhase('player-attack');
        } else {
          setTurnCount((t) => t + 1);
          setBattlePhase('ai-attack');
        }
      }, 800);
      phaseTimersRef.current.push(timer);
      return () => clearTimeout(timer);
    }
  }, [battlePhase, playerHp, aiHp, firstAttacker]);

  useEffect(() => {
    if (battlePhase === 'check-winner') {
      const timer = window.setTimeout(() => {
        if (playerHp <= 0 && aiHp <= 0) {
          setWinner('ai');
        } else if (playerHp <= 0) {
          setWinner('ai');
          setPlayerFadeOut(true);
        } else if (aiHp <= 0) {
          setWinner('player');
          setAiFadeOut(true);
        }
        setTimeout(() => setWinnerGlow(true), 600);
        setBattlePhase('ended');
      }, 500);
      phaseTimersRef.current.push(timer);
      return () => clearTimeout(timer);
    }
  }, [battlePhase, playerHp, aiHp]);

  useEffect(() => {
    if (battlePhase === 'ended' && winner) {
      const timer = window.setTimeout(() => {
        onBattleEnd(winner);
      }, 3500);
      phaseTimersRef.current.push(timer);
      return () => clearTimeout(timer);
    }
  }, [battlePhase, winner, onBattleEnd]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const playerHpPercent = (playerHpDisplay / playerPokemon.hp) * 100;
  const aiHpPercent = (aiHpDisplay / aiPokemon.hp) * 100;

  const getHpBarGradient = (percent: number) => {
    if (percent > 50) return 'linear-gradient(90deg, #51cf66, #94d82d)';
    if (percent > 25) return 'linear-gradient(90deg, #fcc419, #ffd43b)';
    return 'linear-gradient(90deg, #ff6b6b, #fa5252)';
  };

  const winnerPokemon = winner === 'player' ? playerPokemon : winner === 'ai' ? aiPokemon : null;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '420px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #87ceeb 0%, #b8e994 70%, #5a8f3a 100%)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100px',
            background: `
              repeating-linear-gradient(
                90deg,
                #5a8f3a 0px,
                #5a8f3a 20px,
                #4a7f2a 20px,
                #4a7f2a 40px
              )
            `,
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '90px',
            left: '10%',
            fontSize: '40px',
            opacity: 0.5,
          }}
        >
          🌳
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '85px',
            right: '8%',
            fontSize: '45px',
            opacity: 0.5,
          }}
        >
          🌲
        </div>

        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            padding: '6px 18px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 600,
            zIndex: 10,
          }}
        >
          ⚔️ 第 {turnCount} 回合 |
          {firstAttacker === 'player' ? ' 玩家先手' : ' AI先手'}
        </div>

        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '16px',
            width: '280px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: 'rgba(22, 33, 62, 0.9)',
              borderRadius: '10px',
              padding: '10px 14px',
              border: `2px solid ${typeConfig[aiPokemon.type].ring}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                {typeConfig[aiPokemon.type].icon} {aiPokemon.name}
              </span>
              <span style={{ color: '#aaa', fontSize: '12px' }}>
                {aiHpDisplay}/{aiPokemon.hp}
              </span>
            </div>
            <div
              style={{
                height: '10px',
                background: '#333',
                borderRadius: '5px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${aiHpPercent}%`,
                  background: getHpBarGradient(aiHpPercent),
                  transition: 'width 0.1s linear',
                  borderRadius: '5px',
                }}
              />
            </div>
            <div style={{ color: '#888', fontSize: '11px', marginTop: '6px' }}>
              技能: {battlePhase === 'ai-attack' || battlePhase === 'ai-hit' ? aiSkill.name : aiSkill.name}
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '16px',
            width: '280px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: 'rgba(22, 33, 62, 0.9)',
              borderRadius: '10px',
              padding: '10px 14px',
              border: `2px solid ${typeConfig[playerPokemon.type].ring}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                {typeConfig[playerPokemon.type].icon} {playerPokemon.name}
              </span>
              <span style={{ color: '#aaa', fontSize: '12px' }}>
                {playerHpDisplay}/{playerPokemon.hp}
              </span>
            </div>
            <div
              style={{
                height: '10px',
                background: '#333',
                borderRadius: '5px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${playerHpPercent}%`,
                  background: getHpBarGradient(playerHpPercent),
                  transition: 'width 0.1s linear',
                  borderRadius: '5px',
                }}
              />
            </div>
            <div style={{ color: '#888', fontSize: '11px', marginTop: '6px' }}>
              技能: {battlePhase === 'player-attack' || battlePhase === 'player-hit' ? playerSkill.name : playerSkill.name}
            </div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: '12%',
            top: '50%',
            transform: `translateX(${aiAttackProgress * -35}%) translateY(-50%)`,
            transition: 'none',
            zIndex: 5,
          }}
        >
          {aiAttackProgress > 0.3 && aiAttackProgress < 0.7 && (
            <>
              <div
                style={{
                  position: 'absolute',
                  right: '40px',
                  top: 0,
                  fontSize: '72px',
                  opacity: 0.25,
                  filter: 'blur(2px)',
                }}
              >
                {aiPokemon.emoji}
              </div>
              <div
                style={{
                  position: 'absolute',
                  right: '70px',
                  top: 0,
                  fontSize: '72px',
                  opacity: 0.15,
                  filter: 'blur(4px)',
                }}
              >
                {aiPokemon.emoji}
              </div>
            </>
          )}
          <div
            style={{
              position: 'relative',
              opacity: aiFadeOut ? 0 : 1,
              transform: aiFadeOut ? 'scale(0)' : aiHitFlash ? 'scale(1.1)' : 'scale(1)',
              transition: aiFadeOut ? 'all 0.5s ease-out' : 'transform 0.1s',
              filter: aiHitFlash
                ? 'drop-shadow(0 0 15px #ff0000) brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)'
                : 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '-12px',
                borderRadius: '50%',
                background: typeConfig[aiPokemon.type].gradient,
                opacity: 0.4,
              }}
            />
            <div
              style={{
                fontSize: '80px',
                position: 'relative',
                zIndex: 1,
                transform: 'scaleX(-1)',
              }}
            >
              {aiPokemon.emoji}
            </div>
          </div>
          {aiMiss && (
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#ff6b6b',
                fontSize: '24px',
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                animation: 'missFloat 0.5s ease-out',
              }}
            >
              Miss！
            </div>
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            left: '12%',
            top: '58%',
            transform: `translateX(${playerAttackProgress * 35}%) translateY(-50%)`,
            transition: 'none',
            zIndex: 5,
          }}
        >
          {playerAttackProgress > 0.3 && playerAttackProgress < 0.7 && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: '40px',
                  top: 0,
                  fontSize: '72px',
                  opacity: 0.25,
                  filter: 'blur(2px)',
                }}
              >
                {playerPokemon.emoji}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: '70px',
                  top: 0,
                  fontSize: '72px',
                  opacity: 0.15,
                  filter: 'blur(4px)',
                }}
              >
                {playerPokemon.emoji}
              </div>
            </>
          )}
          <div
            style={{
              position: 'relative',
              opacity: playerFadeOut ? 0 : 1,
              transform: playerFadeOut ? 'scale(0)' : playerHitFlash ? 'scale(1.1)' : 'scale(1)',
              transition: playerFadeOut ? 'all 0.5s ease-out' : 'transform 0.1s',
              filter: playerHitFlash
                ? 'drop-shadow(0 0 15px #ff0000) brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5)'
                : 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '-12px',
                borderRadius: '50%',
                background: typeConfig[playerPokemon.type].gradient,
                opacity: 0.4,
              }}
            />
            <div
              style={{
                fontSize: '80px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {playerPokemon.emoji}
            </div>
          </div>
          {playerMiss && (
            <div
              style={{
                position: 'absolute',
                top: '-40px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#ff6b6b',
                fontSize: '24px',
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              Miss！
            </div>
          )}
        </div>

        {floatingTexts.map((ft) => (
          <FloatingDamageText key={ft.id} floating={ft} />
        ))}

        {winnerPokemon && winnerGlow && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              background: 'rgba(0,0,0,0.4)',
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-block',
                  position: 'relative',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: '-40px',
                    borderRadius: '50%',
                    background:
                      'conic-gradient(from 0deg, #ffd700, #fff, #ffd700, #fff, #ffd700)',
                    animation: 'spin 2s linear infinite',
                    opacity: 0.6,
                    filter: 'blur(12px)',
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    background: typeConfig[winnerPokemon.type].gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 60px #ffd700',
                    border: '4px solid #ffd700',
                  }}
                >
                  <span style={{ fontSize: '80px' }}>{winnerPokemon.emoji}</span>
                </div>
              </div>
              <div
                style={{
                  color: '#ffd700',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  textShadow: '0 0 20px rgba(255,215,0,0.8), 2px 2px 4px rgba(0,0,0,0.8)',
                  marginBottom: '8px',
                }}
              >
                🏆 胜利！
              </div>
              <div style={{ color: '#fff', fontSize: '20px', fontWeight: 600 }}>
                {winnerPokemon.name} 获胜！
              </div>
              <div style={{ color: '#aaa', fontSize: '14px', marginTop: '12px' }}>
                {winner === 'player' ? '🎉 恭喜你击败了AI对手！' : '💪 AI获胜，再接再厉！'}
              </div>
            </div>
          </div>
        )}

        {battlePhase === 'ready' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                color: '#fff',
                fontSize: '36px',
                fontWeight: 'bold',
                textShadow: '3px 3px 8px rgba(0,0,0,0.8)',
                animation: 'pulse 1s ease-in-out infinite',
              }}
            >
              ⚡ 准备战斗 ⚡
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes missFloat {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          30% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const FloatingDamageText: React.FC<{ floating: FloatingText }> = ({ floating }) => {
  const [pos, setPos] = useState({ y: 0, opacity: 0 });

  useEffect(() => {
    const start = floating.startTime;
    const animate = () => {
      const now = performance.now();
      const t = Math.min((now - start) / 1000, 1);
      setPos({
        y: -t * 60,
        opacity: 1 - t,
      });
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [floating.startTime]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${floating.x}%`,
        top: `${floating.y}%`,
        transform: `translateY(${pos.y}px)`,
        color: floating.color,
        fontSize: '28px',
        fontWeight: 'bold',
        textShadow: '2px 2px 6px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.3)',
        opacity: pos.opacity,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {floating.text}
    </div>
  );
};
