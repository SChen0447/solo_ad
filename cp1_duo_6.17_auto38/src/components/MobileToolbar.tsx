import React, { useState, useEffect, useRef } from 'react';
import { ColorWheel } from './ColorWheel';

interface MobileToolbarProps {
  color: string;
  hue: number;
  saturation: number;
  lightness: number;
  brushSize: number;
  canUndo: boolean;
  canRedo: boolean;
  isUndoing: boolean;
  isRedoing: boolean;
  onColorChange: (hue: number, saturation: number, lightness: number) => void;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPublish: () => void;
  isPublishing: boolean;
}

export const MobileToolbar: React.FC<MobileToolbarProps> = ({
  color,
  hue,
  saturation,
  lightness,
  brushSize,
  canUndo,
  canRedo,
  isUndoing,
  isRedoing,
  onColorChange,
  onBrushSizeChange,
  onUndo,
  onRedo,
  onPublish,
  isPublishing,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [animatingItems, setAnimatingItems] = useState<number[]>([]);
  const expandTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isExpanded) {
      setAnimatingItems([]);
      const items = [0, 1, 2, 3, 4, 5];
      items.forEach((_, index) => {
        const timeout = window.setTimeout(() => {
          setAnimatingItems((prev) => [...prev, index]);
        }, index * 50);
        return () => clearTimeout(timeout);
      });
    } else {
      setAnimatingItems([]);
    }
  }, [isExpanded]);

  const handleToggle = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setShowColorPicker(false);
    } else {
      setIsExpanded(false);
      setShowColorPicker(false);
    }
  };

  const toolItems = [
    {
      id: 0,
      content: (
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: color,
              border: '3px solid rgba(255,255,255,0.9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
            }}
          />
          {showColorPicker && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 12,
                background: 'rgba(255, 252, 245, 0.95)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: 16,
                padding: 12,
                boxShadow: '0 8px 32px rgba(93, 78, 55, 0.2)',
                border: '1px solid rgba(139, 115, 85, 0.2)',
                zIndex: 200,
                animation: 'fadeSlideUp 0.2s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <ColorWheel
                hue={hue}
                saturation={saturation}
                lightness={lightness}
                onChange={onColorChange}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      id: 1,
      content: (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 11, color: '#8B7355', fontWeight: 500 }}>
            {brushSize}px
          </span>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            style={{
              width: 80,
              height: 4,
              appearance: 'none',
              WebkitAppearance: 'none',
              background: `linear-gradient(90deg, ${color} ${((brushSize - 1) / 49) * 100}%, rgba(139, 115, 85, 0.15) ${((brushSize - 1) / 49) * 100}%)`,
              borderRadius: 2,
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
      ),
    },
    {
      id: 2,
      content: (
        <button
          onClick={onUndo}
          disabled={!canUndo}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: canUndo
              ? 'linear-gradient(135deg, #d4c4a8, #c4b393)'
              : 'rgba(139, 115, 85, 0.1)',
            color: canUndo ? '#5D4E37' : '#b8a88a',
            fontSize: 18,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            transition: 'transform 0.1s ease',
            transform: isUndoing ? 'scale(0.92)' : 'scale(1)',
          }}
        >
          ↶
        </button>
      ),
    },
    {
      id: 3,
      content: (
        <button
          onClick={onRedo}
          disabled={!canRedo}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: canRedo
              ? 'linear-gradient(135deg, #d4c4a8, #c4b393)'
              : 'rgba(139, 115, 85, 0.1)',
            color: canRedo ? '#5D4E37' : '#b8a88a',
            fontSize: 18,
            cursor: canRedo ? 'pointer' : 'not-allowed',
            transition: 'transform 0.1s ease',
            transform: isRedoing ? 'scale(0.92)' : 'scale(1)',
          }}
        >
          ↷
        </button>
      ),
    },
    {
      id: 4,
      content: (
        <button
          onClick={onPublish}
          disabled={isPublishing}
          style={{
            padding: '0 16px',
            height: 44,
            borderRadius: 22,
            border: 'none',
            background: 'linear-gradient(135deg, #8B7355, #6B5344)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: isPublishing ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isPublishing ? '发布中...' : '发布'}
        </button>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: `translateX(-50%) translateY(${isExpanded ? '0' : '0'})`,
          zIndex: 150,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 252, 245, 0.8)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: 24,
            padding: isExpanded ? '16px 20px' : 0,
            boxShadow: '0 8px 32px rgba(93, 78, 55, 0.15)',
            border: '1px solid rgba(139, 115, 85, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            pointerEvents: 'auto',
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: isExpanded ? 'auto' : 'none',
            marginBottom: isExpanded ? 12 : 0,
          }}
        >
          {toolItems.map((item, index) => (
            <div
              key={item.id}
              style={{
                opacity: animatingItems.includes(index) ? 1 : 0,
                transform: animatingItems.includes(index)
                  ? 'translateY(0)'
                  : 'translateY(10px)',
                transition: 'all 0.25s ease',
              }}
            >
              {item.content}
            </div>
          ))}
        </div>
      </div>

      <div
        onClick={handleToggle}
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(255, 252, 245, 0.7)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(139, 115, 85, 0.2)',
          boxShadow: '0 4px 16px rgba(93, 78, 55, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 160,
          fontSize: 20,
          color: '#5D4E37',
          animation: isExpanded ? 'none' : 'breathing 2s ease-in-out infinite',
          transition: 'transform 0.2s ease',
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
        }}
      >
        {isExpanded ? '▼' : '▲'}
      </div>

      <style>{`
        @keyframes breathing {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          border: 2px solid ${color};
        }

        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          border: 2px solid ${color};
        }
      `}</style>
    </>
  );
};
