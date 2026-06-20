import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, THEME, SIZES, RARITY_CONFIG, ANIMATION_CONFIG } from './types';
import { generateThumbnail, renderCardToCanvas } from './utils';

interface CardDeckProps {
  cards: Card[];
  onDelete: (cardId: string) => void;
}

interface DeletingCard {
  id: string;
  timer: ReturnType<typeof setTimeout>;
}

const CardDeck = ({ cards, onDelete }: CardDeckProps) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [deletingCards, setDeletingCards] = useState<Set<string>>(new Set());
  const [showDeleteOption, setShowDeleteOption] = useState<string | null>(null);
  const longPressTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const detailCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const newThumbnails = new Map<string, string>();
    cards.forEach(card => {
      if (!thumbnails.has(card.id)) {
        newThumbnails.set(card.id, generateThumbnail(card));
      } else {
        newThumbnails.set(card.id, thumbnails.get(card.id)!);
      }
    });
    setThumbnails(newThumbnails);
  }, [cards]);

  useEffect(() => {
    if (selectedCard && detailCanvasRef.current) {
      renderCardToCanvas(detailCanvasRef.current, selectedCard);
    }
  }, [selectedCard]);

  const handleMouseDown = (cardId: string) => {
    const timer = setTimeout(() => {
      setShowDeleteOption(cardId);
    }, 500);
    longPressTimerRef.current.set(cardId, timer);
  };

  const handleMouseUp = (cardId: string) => {
    const timer = longPressTimerRef.current.get(cardId);
    if (timer) {
      clearTimeout(timer);
      longPressTimerRef.current.delete(cardId);
    }
  };  const handleMouseLeave = (cardId: string) => {
    const timer = longPressTimerRef.current.get(cardId);
    if (timer) {
      clearTimeout(timer);
      longPressTimerRef.current.delete(cardId);
    }
  };

  const handleTouchStart = (cardId: string) => {
    handleMouseDown(cardId);
  };

  const handleTouchEnd = (cardId: string) => {
    handleMouseUp(cardId);
  };

  const handleDelete = (card: Card) => {
    setShowDeleteOption(null);
    setDeletingCards(prev => new Set(prev).add(card.id));
    
    const timer = setTimeout(() => {
      onDelete(card.id);
      setDeletingCards(prev => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
      setThumbnails(prev => {
        const next = new Map(prev);
        next.delete(card.id);
        return next;
      });
    }, ANIMATION_CONFIG.cardDelete.duration * 1000);
  };

  const handleCardClick = (card: Card) => {
    if (showDeleteOption !== card.id) {
      setSelectedCard(card);
    }
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%'
      }}
    >
      <div
        style={{
          width: SIZES.sidebarWidth,
          backgroundColor: THEME.deckBackground,
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '8px',
            color: THEME.text
          }}
        >
          牌库
        </h2>
        <p
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '16px'
          }}
        >
          共 {cards.length} 张卡牌 · 长按删除
        </p>
      </div>

      <div
        style={{
          flex: 1,
          padding: '32px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {cards.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '16px'
            }}
          >
            暂无卡牌，前往编辑器创建你的第一张卡牌吧！
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '16px',
              padding: '8px'
            }}
          >
            <AnimatePresence>
              {cards.map(card => (
                <motion.div
                  key={card.id}
                  layout
                  initial={false}
                  animate={{
                    x: deletingCards.has(card.id) ? 200 : 0,
                    opacity: deletingCards.has(card.id) ? 0 : 1
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: ANIMATION_CONFIG.cardDelete.duration }}
                  style={{
                    position: 'relative',
                    width: SIZES.thumbnailWidth,
                    height: SIZES.thumbnailHeight,
                    justifySelf: 'center'
                  }}
                >
                  <div
                    onClick={() => handleCardClick(card)}
                    onMouseDown={() => handleMouseDown(card.id)}
                    onMouseUp={() => handleMouseUp(card.id)}
                    onMouseLeave={() => handleMouseLeave(card.id)}
                    onTouchStart={() => handleTouchStart(card.id)}
                    onTouchEnd={() => handleTouchEnd(card.id)}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: `${SIZES.thumbnailRadius}px`,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      position: 'relative',
                      border: `2px solid ${RARITY_CONFIG[card.rarity].color}60`
                    }}
                    onMouseEnter={e => {
                      if (!deletingCards.has(card.id)) {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.4)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                    }}
                  >
                    {thumbnails.get(card.id) && (
                      <img
                        src={thumbnails.get(card.id)!}
                        alt={card.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        draggable={false}
                      />
                    )}

                    {showDeleteOption === card.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          zIndex: 10
                        }}
                      >
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setShowDeleteOption(null);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            borderRadius: '4px',
                            color: THEME.text,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          取消
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(card);
                          }}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: THEME.accent,
                            border: 'none',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer'
                          }}
                        >
                          删除
                        </button>
                      </motion.div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: '6px',
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {card.name}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_CONFIG.modal.duration }}
            onClick={handleCloseModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: THEME.modalOverlay,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              backdropFilter: 'blur(4px)'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: ANIMATION_CONFIG.modal.duration }}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'relative',
                padding: '24px',
                backgroundColor: '#1E1E32',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
              }}
            >
              <button
                onClick={handleCloseModal}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: THEME.text,
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>

              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    borderRadius: `${SIZES.cardRadius}px`,
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  <canvas
                    ref={detailCanvasRef}
                    style={{
                      display: 'block',
                      borderRadius: `${SIZES.cardRadius}px`
                    }}
                  />
                </div>

                <div
                  style={{
                    width: '240px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: '20px',
                        fontWeight: 600,
                        color: THEME.text,
                        marginBottom: '4px'
                      }}
                    >
                      {selectedCard.name}
                    </h3>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: RARITY_CONFIG[selectedCard.rarity].color,
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#FFFFFF'
                      }}
                    >
                      {RARITY_CONFIG[selectedCard.rarity].label}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '16px'
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '24px', marginBottom: '4px' }}>❤</div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#FF6B6B' }}>
                        {selectedCard.hp}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        生命值
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: 'rgba(255, 217, 61, 0.1)',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '24px', marginBottom: '4px' }}>⚔</div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#FFD93D' }}>
                        {selectedCard.attack}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        攻击力
                      </div>
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        marginBottom: '8px'
                      }}
                    >
                      技能描述
                    </div>
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        color: THEME.text,
                        minHeight: '80px'
                      }}
                    >
                      {selectedCard.skill || '暂无技能描述'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CardDeck;
