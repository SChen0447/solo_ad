import React, { useState, useCallback } from 'react';
import { CardData, useAppStore, ELEMENT_LABELS } from '../stores/cardStore';
import { calculateDeckStats } from '../utils/battleEngine';

interface CardTileProps {
  card: CardData;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  draggable?: boolean;
  className?: string;
}

const DeckCardTile: React.FC<CardTileProps> = ({ card, onClick, onDragStart, draggable, className }) => {
  const stars = '★'.repeat(card.stars);
  return (
    <div
      className={`card-tile rarity-${card.rarity} element-${card.element} ${className}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="card-header">
        <span className="card-name">{card.name}</span>
        <span className="card-stars">{stars}</span>
      </div>
      <div className="card-artwork">{card.icon}</div>
      <div className="card-footer">
        <span className="card-element">{ELEMENT_LABELS[card.element]}</span>
        <span className="card-power">⚔{card.basePower}</span>
      </div>
    </div>
  );
};

const MAX_DECK = 10;

const DeckEditor: React.FC = () => {
  const { allCards, collectedCardIds, playerDeck, addToDeck, removeFromDeck, startBattle } = useAppStore();
  const [flashWarning, setFlashWarning] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const collectedCards = allCards.filter((c) => collectedCardIds.includes(c.id));
  const stats = calculateDeckStats(playerDeck);

  const elementColors: Record<string, string> = {
    fire: '#ff5722',
    water: '#03a9f4',
    earth: '#8bc34a',
    wind: '#00bcd4',
    light: '#ffeb3b',
    dark: '#9c27b0',
  };

  const handleDragStart = useCallback((e: React.DragEvent, card: CardData) => {
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, slotIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      const cardId = e.dataTransfer.getData('cardId');
      if (!cardId) return;
      const card = allCards.find((c) => c.id === cardId);
      if (!card) return;

      if (playerDeck.length >= MAX_DECK) {
        setFlashWarning(true);
        setTimeout(() => setFlashWarning(false), 1000);
        return;
      }
      addToDeck(card);
    },
    [allCards, playerDeck.length, addToDeck]
  );

  const handleCardClickToAdd = useCallback(
    (card: CardData) => {
      if (playerDeck.length >= MAX_DECK) {
        setFlashWarning(true);
        setTimeout(() => setFlashWarning(false), 1000);
        return;
      }
      addToDeck(card);
    },
    [playerDeck.length, addToDeck]
  );

  const slots = Array.from({ length: MAX_DECK });
  const deckSlots = slots.map((_, i) => playerDeck[i] || null);

  const totalElements = playerDeck.length || 1;

  return (
    <div className="page-slide-in" style={{ padding: '20px 24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <h2 style={{ fontSize: '22px' }}>🃏 卡组编辑
          {flashWarning && (
            <span
              style={{
                marginLeft: '12px',
                color: '#ff5252',
                fontSize: '14px',
              }}
            >
              卡组已满！
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ opacity: 0.8 }}>
            {playerDeck.length} / {MAX_DECK}
          </span>
          <button
            className="btn-primary"
            disabled={playerDeck.length < 3}
            onClick={startBattle}
            style={{ opacity: playerDeck.length < 3 ? 0.5 : 1, cursor: playerDeck.length < 3 ? 'not-allowed' : 'pointer' }}
          >
            ⚔️ 开始战斗
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#d4a14b' }}>我的卡组</h3>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          {deckSlots.map((card, idx) => (
            <div
              key={idx}
              className={`deck-slot ${dragOverIndex === idx ? 'drag-over' : ''} ${
                flashWarning && !card ? 'flash-warning' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              style={{ position: 'relative' }}
            >
              {card ? (
                <div
                  onClick={() => removeFromDeck(idx)}
                  style={{ position: 'relative' }}
                  title="点击移除"
                >
                  <DeckCardTile card={card} />
                  <div
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#ff5252',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      zIndex: 5,
                    }}
                  >
                    ×
                  </div>
                </div>
              ) : (
                <span>空槽位
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>总战力</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#d4a14b' }}>⚔️ {stats.totalPower}</div>
          </div>
          <div>
            <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>平均战力</div>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{stats.averagePower}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>元素分布</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {(Object.entries(stats.elementDistribution) as [string, number][]).map(
                ([element, count]) => (
                  <div
                    key={element}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: `${elementColors[element]}22`,
                      borderRadius: '6px',
                      border: `1px solid ${elementColors[element]}55`,
                    }}
                  >
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: elementColors[element],
                      }}
                    />
                    <span style={{ fontSize: '13px' }}>{ELEMENT_LABELS[element as keyof typeof ELEMENT_LABELS]}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>
                      {count} ({Math.round((count / totalElements) * 100)}%)
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#d4a14b' }}>可拖拽的幻灵（点击或拖拽添加到卡组）</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '16px',
            justifyItems: 'center',
          }}
        >
          {collectedCards.map((card) => (
            <DeckCardTile
              key={card.id}
              card={card}
              draggable
              onClick={() => handleCardClickToAdd(card)}
              onDragStart={(e) => handleDragStart(e, card)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeckEditor;
