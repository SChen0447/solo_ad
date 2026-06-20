import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, Rarity, RARITY_CONFIG, FIELDS, THEME, SIZES } from './types';
import { renderCardToCanvas } from './utils';

interface CardEditorProps {
  card: Card;
  onChange: (card: Card) => void;
  onSave: (card: Card) => void;
}

const CardEditor = ({ card, onChange, onSave }: CardEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderCardToCanvas(canvasRef.current, card);
    }
  }, [card]);

  const handleInputChange = useCallback(
    (key: string, value: string | number) => {
      onChange({ ...card, [key]: value });
    },
    [card, onChange]
  );

  const handleRarityChange = useCallback(
    (rarity: Rarity) => {
      onChange({ ...card, rarity });
    },
    [card, onChange]
  );

  const handleDragStart = (fieldKey: string) => {
    setDraggedField(fieldKey);
  };

  const handleDragEnd = () => {
    setDraggedField(null);
  };

  const handleDrop = () => {
    setDraggedField(null);
  };

  const handleSave = () => {
    if (!card.name.trim()) {
      alert('请输入卡牌名称');
      return;
    }
    onSave(card);
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        padding: '32px',
        gap: '40px'
      }}
    >
      <div
        style={{
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto',
          paddingRight: '16px'
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '16px',
              color: THEME.text
            }}
          >
            字段模板
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FIELDS.map(field => (
              <motion.div
                key={field.key}
                draggable
                onDragStart={() => handleDragStart(field.key)}
                onDragEnd={handleDragEnd}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'grab',
                  userSelect: 'none'
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    marginBottom: '8px',
                    color: THEME.text
                  }}
                >
                  {field.label}
                </div>
                {field.type === 'text' && (
                  <input
                    type="text"
                    value={card[field.key as keyof Card] as string}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    onClick={e => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: THEME.text,
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                )}
                {field.type === 'number' && (
                  <input
                    type="number"
                    value={card[field.key as keyof Card] as number}
                    onChange={e =>
                      handleInputChange(field.key, parseInt(e.target.value) || 0)
                    }
                    placeholder={field.placeholder}
                    onClick={e => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: THEME.text,
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                )}
                {field.type === 'textarea' && (
                  <textarea
                    value={card[field.key as keyof Card] as string}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    onClick={e => e.stopPropagation()}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: THEME.text,
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                )}
                {field.type === 'select' && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(field.options as string[]).map(opt => (
                      <button
                        key={opt}
                        onClick={e => {
                          e.stopPropagation();
                          handleRarityChange(opt as Rarity);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor:
                            card.rarity === opt
                              ? RARITY_CONFIG[opt as Rarity].color
                              : 'rgba(0, 0, 0, 0.3)',
                          border:
                            card.rarity === opt
                              ? `2px solid ${RARITY_CONFIG[opt as Rarity].color}`
                              : '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '20px',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {RARITY_CONFIG[opt as Rarity].label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          style={{
            padding: '14px 24px',
            backgroundColor: THEME.accent,
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '8px',
            boxShadow: '0 4px 12px rgba(233, 69, 96, 0.3)'
          }}
        >
          生成并保存卡牌
        </motion.button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            position: 'relative',
            transform: draggedField ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.2s ease',
            boxShadow: draggedField
              ? '0 0 40px rgba(233, 69, 96, 0.4)'
              : '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              borderRadius: `${SIZES.cardRadius}px`
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.6)'
            }}
          >
            拖拽字段到卡牌上
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardEditor;
