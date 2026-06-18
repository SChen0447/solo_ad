import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CardData, useAppStore, ELEMENT_LABELS } from '../stores/cardStore';
import {
  resolveBattle,
  getElementColor,
  formatBattleMessage,
  checkResonance,
} from '../utils/battleEngine';

interface BattleCardProps {
  card: CardData | null;
  side: 'player' | 'ai';
  charging: boolean;
  showPower?: number;
}

const BattleCard: React.FC<BattleCardProps> = ({ card, side, charging, showPower }) => {
  if (!card) {
    return (
      <div
        className="deck-slot"
        style={{
          transform: side === 'player' ? 'scaleX(1)' : 'scaleX(1)',
        }}
      >
        <span>等待出牌</span>
      </div>
    );
  }
  const stars = '★'.repeat(card.stars);
  return (
    <div
      className={`card-tile rarity-${card.rarity} element-${card.element} battle-card-charge`}
      style={{
        ['--charge-direction' as any]: side === 'player' ? '60px' : '-60px',
        animationDuration: charging ? '0.4s' : '0s',
      }}
    >
      <div className="card-header">
        <span className="card-name">{card.name}</span>
        <span className="card-stars">{stars}</span>
      </div>
      <div className="card-artwork">{card.icon}</div>
      <div className="card-footer">
        <span className="card-element">{ELEMENT_LABELS[card.element]}</span>
        <span className="card-power">⚔{showPower || card.basePower}</span>
      </div>
    </div>
  );
};

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  life: number;
}

const ParticleEffect: React.FC<{ particles: Particle[] }> = ({ particles }) => {
  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.x,
            top: p.y,
            background: p.color,
            opacity: p.life,
            transform: `scale(${p.life})`,
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}
    </>
  );
};

const ResonanceEffect: React.FC<{ element: string }> = ({ element }) => {
  const color = getElementColor(element as any);
  return (
    <div
      className="resonance-effect"
      style={{
        background: `radial-gradient(circle at center, ${color}66 0%, ${color}22 40%, transparent 70%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '72px',
          fontWeight: 900,
          color: color,
          textShadow: `0 0 30px ${color}, 0 0 60px ${color}`,
          fontFamily: 'Orbitron, sans-serif',
        }}
      >
        共鸣!
      </div>
    </div>
  );
};

const BattleField: React.FC = () => {
  const {
    battle,
    playCard,
    aiPlay,
    endBattle,
    setCurrentPage,
    resetResonance,
  } = useAppStore();

  const [showParticles, setShowParticles] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [particleCenter, setParticleCenter] = useState({ x: 0, y: 0 });
  const [winnerColor, setWinnerColor] = useState('#ffffff');
  const [isCharging, setIsCharging] = useState(false);
  const [showResonance, setShowResonance] = useState<string | null>(null);
  const [playerDisplayPower, setPlayerDisplayPower] = useState<number | undefined>(undefined);
  const [aiDisplayPower, setAiDisplayPower] = useState<number | undefined>(undefined);
  const particleIdRef = useRef(0);

  const spawnParticles = useCallback((centerX: number, centerY: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      newParticles.push({
        id: particleIdRef.current++,
        x: centerX,
        y: centerY,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        color,
        life: 1,
      });
    }
    setParticles(newParticles);
    setShowParticles(true);

    let frame = 0;
    const animate = () => {
      frame++;
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.dx,
            y: p.y + p.dy,
            dy: p.dy + 0.1,
            life: Math.max(0, 1 - frame / 40),
          }))
          .filter((p) => p.life > 0)
      );
      if (frame < 40) {
        requestAnimationFrame(animate);
      } else {
        setShowParticles(false);
        setParticles([]);
      }
    };
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (!battle) return;
    if (battle.playerCard && !battle.aiCard && !battle.isPlayerTurn && !battle.battleOver) {
      const t = setTimeout(() => {
        aiPlay();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [battle, aiPlay]);

  useEffect(() => {
    if (!battle) return;
    if (battle.playerCard && battle.aiCard && !battle.battleOver) {
      setIsCharging(true);

      const chargeTimeout = setTimeout(() => {
        const resonanceElement = battle.resonanceTriggered
          ? checkResonance(battle.resonanceChain)
          : null;

        if (resonanceElement) {
          setShowResonance(resonanceElement);
          setTimeout(() => {
            setShowResonance(null);
            resetResonance();
          }, 1500);
        }

        const result = resolveBattle(
          battle.playerCard!,
          battle.aiCard!,
          battle.resonanceTriggered
        );

        setPlayerDisplayPower(result.playerPower);
        setAiDisplayPower(result.aiPower);

        const centerX = 400;
        const centerY = 150;
        const winColor =
          result.winner === 'player'
            ? getElementColor(battle.playerCard!.element)
            : result.winner === 'ai'
            ? getElementColor(battle.aiCard!.element)
            : '#ffffff';
        setWinnerColor(winColor);
        setParticleCenter({ x: centerX, y: centerY });

        setTimeout(() => {
          spawnParticles(centerX, centerY, winColor);
        }, 100);

        setTimeout(() => {
          setIsCharging(false);
          const newBattle = { ...battle };
          const damageToPlayer = result.playerDamage;
          const damageToAi = result.aiDamage;
          const newPlayerHp = Math.max(0, battle.playerHp - damageToPlayer);
          const newAiHp = Math.max(0, battle.aiHp - damageToAi);

          const message = formatBattleMessage(
            result.winner,
            battle.playerCard!,
            battle.aiCard!,
            result.playerPower,
            result.aiPower,
            result.winner === 'player' ? damageToAi : damageToPlayer
          );

          if (newPlayerHp <= 0) {
            endBattle('ai');
          } else if (newAiHp <= 0) {
            endBattle('player');
          } else {
            useAppStore.setState({
              battle: {
                ...newBattle,
                playerHp: newPlayerHp,
                aiHp: newAiHp,
                playerCard: null,
                aiCard: null,
                isPlayerTurn: true,
                turn: battle.turn + 1,
                battleLog: [...battle.battleLog, `💥 ${message}`],
              },
            });
            setPlayerDisplayPower(undefined);
            setAiDisplayPower(undefined);
          }
        }, 1200);
      }, 400);

      return () => clearTimeout(chargeTimeout);
    }
  }, [battle?.playerCard, battle?.aiCard]);

  if (!battle) {
    return (
      <div className="page-slide-in" style={{ padding: '40px', textAlign: 'center' }}>
        <h2>⚔️ 尚未开始战斗</h2>
        <p style={{ marginTop: '16px', opacity: 0.8 }}>
          请先前往卡组编辑组建你的卡组
        </p>
        <button
          className="btn-primary"
          style={{ marginTop: '24px' }}
          onClick={() => setCurrentPage('deck')}
        >
          前往卡组编辑
        </button>
      </div>
    );
  }

  const handFanAngle = (battle.playerHand.length - 1) * 6;
  const startAngle = -handFanAngle / 2;

  return (
    <div className="page-slide-in" style={{ padding: '16px 24px', minHeight: '100vh' }}>
      {showResonance && <ResonanceEffect element={showResonance} />}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ fontSize: '20px' }}>⚔️ 战斗中 - 回合 {battle.turn}</h2>
        <button className="btn-primary" onClick={() => setCurrentPage('codex')}>
          返回图鉴
        </button>
      </div>

      <div
        className="panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '20px',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '13px', marginBottom: '4px', opacity: 0.8 }}>
            你 ❤️ {battle.playerHp}
          </div>
          <div className="battle-health-bar">
            <div
              className="battle-health-fill player"
              style={{ width: `${(battle.playerHp / 500) * 100}%` }}
            />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '200px', textAlign: 'right' }}>
          <div style={{ fontSize: '13px', marginBottom: '4px', opacity: 0.8 }}>
            🤖 AI {battle.aiHp} ❤️
          </div>
          <div className="battle-health-bar" style={{ marginLeft: 'auto' }}>
            <div
              className="battle-health-fill"
              style={{ width: `${(battle.aiHp / 500) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          height: '320px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          background: 'linear-gradient(180deg, rgba(106,59,239,0.1) 0%, rgba(74,108,247,0.1) 100%)',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid rgba(212,161,75,0.2)',
          overflow: 'visible',
        }}
      >
        {showParticles && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          >
            <ParticleEffect particles={particles} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>你的出战</span>
          <BattleCard
            card={battle.playerCard}
            side="player"
            charging={isCharging}
            showPower={playerDisplayPower}
          />
        </div>

        <div
          style={{
            fontSize: '36px',
            fontWeight: 900,
            color: winnerColor,
            textShadow: `0 0 10px ${winnerColor}`,
            opacity: isCharging ? 1 : 0.5,
            transition: 'all 0.3s',
          }}
        >
          VS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>AI出战</span>
          <BattleCard
            card={battle.aiCard}
            side="ai"
            charging={isCharging}
            showPower={aiDisplayPower}
          />
        </div>
      </div>

      {battle.battleOver && (
        <div
          className="panel"
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            border: `2px solid ${battle.winner === 'player' ? '#4caf50' : '#ff5252'}`,
          }}
        >
          <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>
            {battle.winner === 'player' ? '🏆 胜利！' : '💀 失败'}
          </h2>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>
            获得积分: <strong style={{ color: '#d4a14b' }}>{battle.score}</strong>
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => setCurrentPage('deck')}>
              返回卡组
            </button>
            <button className="btn-primary" onClick={() => useAppStore.getState().startBattle()}>
              再战一场
            </button>
          </div>
        </div>
      )}

      {!battle.battleOver && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            height: '200px',
            position: 'relative',
            paddingTop: '40px',
          }}
        >
          <div style={{ fontSize: '14px', position: 'absolute', top: 0, left: 0, opacity: 0.7 }}>
            {battle.isPlayerTurn ? '👆 选择一张卡牌出战' : '⏳ AI思考中...'}
          </div>
          {battle.resonanceChain.length > 0 && (
            <div
              style={{
                fontSize: '13px',
                position: 'absolute',
                top: 0,
                right: 0,
                opacity: 0.8,
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
              }}
            >
              连击:
              {battle.resonanceChain.slice(-3).map((e, i) => (
                <span
                  key={i}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: getElementColor(e),
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
          )}
          {battle.playerHand.length === 0 ? (
            <div style={{ opacity: 0.7 }}>手牌已用完</div>
          ) : (
            battle.playerHand.map((card, idx) => {
              const angle =
                battle.playerHand.length === 1
                  ? 0
                  : startAngle + (idx / (battle.playerHand.length - 1)) * handFanAngle;
              return (
                <div
                  key={card.id}
                  className="hand-card"
                  onClick={() => battle.isPlayerTurn && playCard(idx)}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    transform: `rotate(${angle}deg) translateY(${Math.abs(angle) * 0.5}px)`,
                    transformOrigin: 'bottom center',
                    marginLeft: `${(idx - (battle.playerHand.length - 1) / 2) * 30}px`,
                    opacity: battle.isPlayerTurn ? 1 : 0.5,
                    pointerEvents: battle.isPlayerTurn ? 'auto' : 'none',
                    cursor: battle.isPlayerTurn ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease-out',
                  }}
                >
                  <BattleCard card={card} side="player" charging={false} />
                </div>
              );
            })
          )}
        </div>
      )}

      <div
        className="panel"
        style={{
          marginTop: '20px',
          maxHeight: '150px',
          overflowY: 'auto',
          fontSize: '13px',
          lineHeight: 1.8,
        }}
      >
        <h4 style={{ marginBottom: '8px', color: '#d4a14b' }}>战斗日志</h4>
        {battle.battleLog.slice().reverse().map((log, i) => (
          <div key={i} style={{ opacity: 1 - i * 0.08 }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BattleField;
