import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ALL_CARDS, CardData, Element, ELEMENT_COLORS, ELEMENT_NAMES, TYPE_NAMES } from './cardData';

interface DeckBuilderProps {
  onBack: () => void;
  onStartBattle: (deck: string[]) => void;
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({ onBack, onStartBattle }) => {
  const [deck, setDeck] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterElement, setFilterElement] = useState<Element | 'all'>('all');
  const [filterCost, setFilterCost] = useState<number | 'all'>('all');
  const [draggedCard, setDraggedCard] = useState<CardData | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('playerDeck');
    if (saved) {
      setDeck(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (deck.length > 0) {
      localStorage.setItem('playerDeck', JSON.stringify(deck));
    }
  }, [deck]);

  const filteredCards = useMemo(() => {
    return ALL_CARDS.filter(card => {
      if (searchTerm && !card.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterElement !== 'all' && card.element !== filterElement) return false;
      if (filterCost !== 'all' && card.cost !== filterCost) return false;
      return true;
    });
  }, [searchTerm, filterElement, filterCost]);

  const getCardCountInDeck = (cardId: string): number => {
    return deck.filter(id => id === cardId).length;
  };

  const addCard = (card: CardData) => {
    if (deck.length >= 30) return;
    const count = getCardCountInDeck(card.id);
    if (count >= 3) return;
    setDeck([...deck, card.id]);
  };

  const removeCard = (index: number) => {
    const newDeck = [...deck];
    newDeck.splice(index, 1);
    setDeck(newDeck);
  };

  const moveCard = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= deck.length) return;
    const newDeck = [...deck];
    const [card] = newDeck.splice(fromIndex, 1);
    newDeck.splice(toIndex, 0, card);
    setDeck(newDeck);
  };

  const clearDeck = () => {
    setDeck([]);
    localStorage.removeItem('playerDeck');
  };

  const deckStats = useMemo(() => {
    const costCurve: Record<number, number> = {};
    const elementCount: Record<Element, number> = {
      fire: 0, water: 0, wind: 0, light: 0, dark: 0
    };

    deck.forEach(cardId => {
      const card = ALL_CARDS.find(c => c.id === cardId);
      if (card) {
        costCurve[card.cost] = (costCurve[card.cost] || 0) + 1;
        elementCount[card.element]++;
      }
    });

    return { costCurve, elementCount };
  }, [deck]);

  const maxCostCount = Math.max(...Object.values(deckStats.costCurve), 1);
  const totalCards = deck.length;

  const renderCard = (card: CardData, onClick: () => void, showCount = false) => {
    const count = getCardCountInDeck(card.id);
    const isMaxed = count >= 3;
    const isFull = deck.length >= 30;

    return (
      <motion.div
        key={card.id}
        onClick={onClick}
        draggable
        onDragStart={() => setDraggedCard(card)}
        onDragEnd={() => setDraggedCard(null)}
        whileHover={{ scale: 1.05, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
        style={{
          width: '80px',
          height: '120px',
          borderRadius: '8px',
          backgroundColor: 'white',
          border: `2px solid ${ELEMENT_COLORS[card.element]}`,
          display: 'flex',
          flexDirection: 'column',
          padding: '4px',
          cursor: 'pointer',
          boxSizing: 'border-box',
          position: 'relative',
          transition: 'all 0.2s ease',
          opacity: isMaxed && showCount ? 0.5 : 1
        }}
      >
        <div style={{
          position: 'absolute',
          top: '-5px',
          left: '-5px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#2a3f5f',
          color: 'white',
          fontSize: '10px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #4a90d9'
        }}>
          {card.cost}
        </div>

        <div style={{
          fontSize: '9px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: '10px',
          color: '#333'
        }}>
          {card.name}
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          {card.element === 'fire' && '🔥'}
          {card.element === 'water' && '💧'}
          {card.element === 'wind' && '🌪️'}
          {card.element === 'light' && '✨'}
          {card.element === 'dark' && '🌑'}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          fontWeight: 'bold'
        }}>
          <span style={{ color: '#e63946' }}>⚔{card.attack}</span>
          <span style={{ color: '#2a9d8f' }}>❤{card.health}</span>
        </div>

        {showCount && count > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            right: '-5px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: isMaxed ? '#e63946' : '#457b9d',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white'
          }}>
            {count}
          </div>
        )}
      </motion.div>
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedCard) {
      addCard(draggedCard);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      color: 'white',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>🎴 卡组编辑器</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c5b7b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            返回首页
          </button>
          <button
            onClick={() => onStartBattle(deck)}
            disabled={deck.length < 10}
            style={{
              padding: '8px 16px',
              backgroundColor: deck.length >= 10 ? '#e63946' : '#555',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: deck.length >= 10 ? 'pointer' : 'not-allowed'
            }}
          >
            开始对战
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', padding: '12px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="搜索卡牌..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                backgroundColor: '#2d3748',
                color: 'white',
                fontSize: '13px'
              }}
            />
            <select
              value={filterElement}
              onChange={(e) => setFilterElement(e.target.value as Element | 'all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                backgroundColor: '#2d3748',
                color: 'white',
                fontSize: '13px'
              }}
            >
              <option value="all">全部属性</option>
              <option value="fire">🔥 火</option>
              <option value="water">💧 水</option>
              <option value="wind">🌪️ 风</option>
              <option value="light">✨ 光</option>
              <option value="dark">🌑 暗</option>
            </select>
            <select
              value={filterCost.toString()}
              onChange={(e) => setFilterCost(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #4a5568',
                backgroundColor: '#2d3748',
                color: 'white',
                fontSize: '13px'
              }}
            >
              <option value="all">全部费用</option>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n}费</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>
            全部卡牌 ({filteredCards.length}张) - 点击或拖拽添加到卡组
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '10px',
            padding: '8px',
            alignContent: 'start'
          }}>
            {filteredCards.map(card => renderCard(card, () => addCard(card), true))}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
              当前卡组 ({deck.length}/30)
            </span>
            <button
              onClick={clearDeck}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                backgroundColor: '#e63946',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              清空
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              border: `2px dashed ${draggedCard ? '#457b9d' : '#4a5568'}`,
              borderRadius: '8px',
              padding: '8px',
              backgroundColor: 'rgba(0,0,0,0.2)'
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {deck.map((cardId, index) => {
              const card = ALL_CARDS.find(c => c.id === cardId);
              if (!card) return null;
              return (
                <motion.div
                  key={`${cardId}_${index}`}
                  onClick={() => removeCard(index)}
                  whileHover={{ x: 5 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 8px',
                    marginBottom: '4px',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    borderLeft: `3px solid ${ELEMENT_COLORS[card.element]}`
                  }}
                  draggable
                  onDragStart={() => {}}
                >
                  <span style={{ width: '20px', fontSize: '11px', color: '#888' }}>{index + 1}</span>
                  <span style={{ fontSize: '16px', marginRight: '6px' }}>
                    {card.element === 'fire' && '🔥'}
                    {card.element === 'water' && '💧'}
                    {card.element === 'wind' && '🌪️'}
                    {card.element === 'light' && '✨'}
                    {card.element === 'dark' && '🌑'}
                  </span>
                  <span style={{ flex: 1, fontSize: '13px' }}>{card.name}</span>
                  <span style={{ fontSize: '11px', color: '#4a90d9', marginRight: '6px' }}>
                    {card.cost}费
                  </span>
                  <span style={{ fontSize: '11px', color: '#e63946' }}>
                    ⚔{card.attack}
                  </span>
                  <span style={{ fontSize: '11px', color: '#2a9d8f', marginLeft: '4px' }}>
                    ❤{card.health}
                  </span>
                </motion.div>
              );
            })}
            {deck.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#666',
                padding: '30px',
                fontSize: '13px'
              }}>
                拖拽或点击左侧卡牌添加到卡组
              </div>
            )}
          </div>

          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '8px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>卡组统计</div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>费用曲线</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
                {[1, 2, 3, 4, 5, 6].map(cost => {
                  const count = deckStats.costCurve[cost] || 0;
                  const height = totalCards > 0 ? (count / maxCostCount) * 100 : 0;
                  return (
                    <div key={cost} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '100%',
                        height: `${height}%`,
                        minHeight: count > 0 ? '4px' : '0',
                        backgroundColor: '#457b9d',
                        borderRadius: '2px 2px 0 0'
                      }} />
                      <span style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{cost}费</span>
                      <span style={{ fontSize: '10px', color: '#aaa' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '6px' }}>属性分布</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(['fire', 'water', 'wind', 'light', 'dark'] as Element[]).map(element => {
                  const count = deckStats.elementCount[element];
                  const pct = totalCards > 0 ? (count / totalCards) * 100 : 0;
                  return (
                    <div key={element} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '30px', fontSize: '12px' }}>
                        {element === 'fire' && '🔥'}
                        {element === 'water' && '💧'}
                        {element === 'wind' && '🌪️'}
                        {element === 'light' && '✨'}
                        {element === 'dark' && '🌑'}
                      </span>
                      <div style={{
                        flex: 1,
                        height: '12px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: ELEMENT_COLORS[element],
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#aaa', width: '30px', textAlign: 'right' }}>
                        {count}张
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckBuilder;
