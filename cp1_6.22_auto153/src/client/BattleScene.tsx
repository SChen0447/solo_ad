import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from './Card';
import type { BattleState, CardData, BattleEvent, PlacedCard } from '../shared/types';
import { FIELD_SIZE, INITIAL_HP, ELEMENT_NAMES } from '../shared/constants';

interface BattleSceneProps {
  battleState: BattleState;
  playerId: string;
  opponentInfo: { id: string; nickname: string };
  onPlayCard: (cardId: string, position: number) => void;
  onEndTurn: () => void;
  events: BattleEvent[];
  isOpponentDisconnected: boolean;
}

interface FloatingNumber {
  id: string;
  value: number;
  x: number;
  y: number;
  color: string;
}

interface AnimationCard {
  id: string;
  card: CardData;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  targetPosition: number;
  isOwn: boolean;
}

const Avatar: React.FC<{ name: string; isActive: boolean; hp: number; maxHp: number; side: 'left' | 'right' }> = ({
  name,
  isActive,
  hp,
  maxHp,
  side,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const barColor = hpPct > 60 ? '#22c55e' : hpPct > 30 ? '#eab308' : '#ef4444';

  return (
    <div className={`player-panel ${side} ${isActive ? 'player-active' : 'player-inactive'}`}>
      <div className={`avatar ${isActive ? 'avatar-glow' : ''}`}>
        <span className="avatar-text">{name.charAt(0)}</span>
      </div>
      <div className="player-info">
        <div className="player-name">{name}</div>
        <div className="hp-bar-container">
          <div
            className="hp-bar-fill"
            style={{ width: `${hpPct}%`, background: `linear-gradient(90deg, #ef4444, ${barColor})` }}
          />
          <span className="hp-text">{hp}/{maxHp}</span>
        </div>
      </div>
    </div>
  );
};

const BattleScene: React.FC<BattleSceneProps> = ({
  battleState,
  playerId,
  opponentInfo,
  onPlayCard,
  onEndTurn,
  events,
  isOpponentDisconnected,
}) => {
  const me = battleState.players[playerId];
  const opponent = battleState.players[opponentInfo.id];
  const isMyTurn = battleState.currentTurnPlayerId === playerId;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ message: string; color: 'danger' | 'success' | 'info' } | null>(null);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [animatingCards, setAnimatingCards] = useState<AnimationCard[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);

  const battleAreaRef = useRef<HTMLDivElement>(null);

  const processedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    events.forEach((ev, idx) => {
      const key = `${battleState.lastActionAt}-${idx}-${ev.type}-${ev.message}`;
      if (processedEventsRef.current.has(key)) return;
      processedEventsRef.current.add(key);

      const color =
        ev.bannerColor === 'danger' ? 'danger' : ev.bannerColor === 'success' ? 'success' : 'info';
      setBanner({ message: ev.message, color });
      setTimeout(() => setBanner(null), 1500);

      if (ev.type === 'damage_dealt' && ev.damage !== undefined && ev.damage > 0) {
        const id = `${Date.now()}-${idx}`;
        const fn: FloatingNumber = {
          id,
          value: ev.damage,
          x: 50 + (Math.random() - 0.5) * 20,
          y: 40 + (Math.random() - 0.5) * 10,
          color: ev.playerId === playerId ? '#ef4444' : '#22c55e',
        };
        setFloatingNumbers((prev) => [...prev, fn]);
        setTimeout(() => {
          setFloatingNumbers((prev) => prev.filter((f) => f.id !== id));
        }, 1200);
      }

      if (ev.type === 'battle_ended') {
        setTimeout(() => setShowResultModal(true), 600);
      }
    });
  }, [events, battleState.lastActionAt, playerId]);

  const handleSlotDrop = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    setDragOverPosition(null);
    if (!isMyTurn) return;
    const cardId = e.dataTransfer.getData('cardId');
    if (!cardId) return;
    if (me.field[position] !== null) return;
    console.log('[sfx] play_card');
    onPlayCard(cardId, position);
    setSelectedCardId(null);
  };

  const handleSlotClick = (position: number) => {
    if (!isMyTurn) return;
    if (!selectedCardId) return;
    if (me.field[position] !== null) return;
    console.log('[sfx] play_card');
    onPlayCard(selectedCardId, position);
    setSelectedCardId(null);
  };

  const handleCardClick = (card: CardData) => {
    if (!isMyTurn) return;
    setSelectedCardId((prev) => (prev === card.id ? null : card.id));
  };

  const handleCardDragStart = (e: React.DragEvent, card: CardData) => {
    if (!isMyTurn) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('cardId', card.id);
    setSelectedCardId(card.id);
  };

  const handleEndTurn = () => {
    if (!isMyTurn) return;
    console.log('[sfx] end_turn');
    onEndTurn();
    setSelectedCardId(null);
  };

  const resultText = useMemo(() => {
    if (battleState.winnerId === playerId) return '🎉 胜利！';
    if (battleState.winnerId === opponentInfo.id) return '💀 失败';
    return '';
  }, [battleState.winnerId, playerId, opponentInfo.id]);

  const handCards = me?.hand || [];
  const myField = me?.field || Array(FIELD_SIZE).fill(null);
  const oppField = opponent?.field || Array(FIELD_SIZE).fill(null);
  const oppHand = opponent?.hand || [];

  return (
    <div className="battle-scene" ref={battleAreaRef}>
      {banner && (
        <div className={`banner banner-${banner.color}`}>
          {banner.message}
        </div>
      )}

      {isOpponentDisconnected && (
        <div className="banner banner-danger opponent-dc-banner">
          对手连接中断，等待重连中...
        </div>
      )}

      <div className="battle-top-bar">
        <Avatar
          name={opponent?.nickname || opponentInfo.nickname}
          isActive={!isMyTurn && battleState.phase === 'playing'}
          hp={opponent?.hp || INITIAL_HP}
          maxHp={INITIAL_HP}
          side="left"
        />
        <div className="turn-indicator">
          <div className="turn-number">第 {battleState.turnNumber} 回合</div>
          <div className="turn-player">
            {isMyTurn ? '你的回合' : '对手回合'}
          </div>
        </div>
        <Avatar
          name={me?.nickname || '你'}
          isActive={isMyTurn && battleState.phase === 'playing'}
          hp={me?.hp || INITIAL_HP}
          maxHp={INITIAL_HP}
          side="right"
        />
      </div>

      <div className="opponent-hand">
        {oppHand.map((_, idx) => (
          <div
            key={`opp-hand-${idx}`}
            className="opp-card-back"
            style={{
              transform: `rotate(${(idx - (oppHand.length - 1) / 2) * 6}deg) translateY(${Math.abs(idx - (oppHand.length - 1) / 2) * 4}px)`,
            }}
          >
            <div className="card card-small card-back">
              <div className="card-back-inner">
                <div className="card-back-pattern" />
                <div className="card-back-logo">✦</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="battle-area-container">
        <div className="battle-area">
          <div className="field-row opponent-field">
            {oppField.map((card, idx) => (
              <div
                key={`opp-slot-${idx}`}
                className={`field-slot ${card ? 'occupied' : ''}`}
              >
                {card && (
                  <div className="placed-card-wrapper opponent-card">
                    <Card card={card} small showSkill={false} />
                  </div>
                )}
                {!card && <div className="slot-placeholder">空位</div>}
              </div>
            ))}
          </div>

          <div className="field-divider">
            <span>VS</span>
          </div>

          {floatingNumbers.map((fn) => (
            <div
              key={fn.id}
              className="floating-number"
              style={{
                left: `${fn.x}%`,
                top: `${fn.y}%`,
                color: fn.color,
              }}
            >
              {fn.color === '#ef4444' ? '-' : '+'}{fn.value}
            </div>
          ))}

          <div className="field-row my-field">
            {myField.map((card, idx) => (
              <div
                key={`my-slot-${idx}`}
                className={`field-slot ${card ? 'occupied' : ''} ${
                  dragOverPosition === idx ? 'slot-drag-over' : ''
                } ${selectedCardId && !card ? 'slot-selectable' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!card) setDragOverPosition(idx);
                }}
                onDragLeave={() => setDragOverPosition(null)}
                onDrop={(e) => handleSlotDrop(e, idx)}
                onClick={() => handleSlotClick(idx)}
              >
                {card && (
                  <div className="placed-card-wrapper my-card">
                    <Card card={card} small showSkill={false} />
                  </div>
                )}
                {!card && <div className="slot-placeholder">放置卡牌</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="my-hand-wrapper">
        <div className="my-hand">
          {handCards.map((card, idx) => {
            const total = handCards.length;
            const center = (total - 1) / 2;
            const offset = idx - center;
            const angle = offset * 4;
            const translateY = Math.abs(offset) * 8;
            return (
              <div
                key={card.id}
                className="hand-card-wrapper"
                style={{
                  transform: `rotate(${angle}deg) translateY(${translateY}px)`,
                  zIndex: selectedCardId === card.id ? 100 : idx,
                }}
              >
                <Card
                  card={card}
                  isSelected={selectedCardId === card.id}
                  isDraggable={isMyTurn}
                  onClick={() => handleCardClick(card)}
                  onDragStart={(e) => handleCardDragStart(e, card)}
                  onDragEnd={() => {
                    setDragOverPosition(null);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="battle-controls">
        <button
          className="end-turn-btn"
          onClick={handleEndTurn}
          disabled={!isMyTurn || battleState.phase !== 'playing'}
        >
          {isMyTurn ? '结束回合 ⏭' : '等待对手...'}
        </button>
        <div className="deck-info">
          <div>牌库: {me?.deck.length || 0}</div>
          <div>手牌: {me?.hand.length || 0}</div>
        </div>
      </div>

      {showResultModal && (
        <div className="result-modal-overlay">
          <div className="result-modal">
            <div className="result-text">{resultText}</div>
            <div className="result-stats">
              <div>回合数: {battleState.turnNumber}</div>
              <div>
                对手: {opponent?.nickname || opponentInfo.nickname}
              </div>
            </div>
            <button className="btn-primary back-btn" onClick={() => window.location.reload()}>
              返回大厅
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleScene;
