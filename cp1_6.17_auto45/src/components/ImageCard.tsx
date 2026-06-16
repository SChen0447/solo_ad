import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ComicCard, SpeechBubble, Narration, BubbleStyle } from '../types';

const BUBBLE_STYLES: BubbleStyle[] = [
  { id: 'oval', name: '椭圆云状' },
  { id: 'rounded', name: '矩形圆角' },
  { id: 'shout', name: '尖角喊话' },
  { id: 'thought', name: '虚线思考' },
];

interface ImageCardProps {
  card: ComicCard;
  isExpanded: boolean;
  onUpdateCard: (updates: Partial<ComicCard>) => void;
  onClick?: () => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ card, isExpanded, onUpdateCard, onClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editingBubbleId, setEditingBubbleId] = useState<string | null>(null);
  const [editingNarration, setEditingNarration] = useState(false);
  const [draggingBubbleId, setDraggingBubbleId] = useState<string | null>(null);
  const [draggingNarration, setDraggingNarration] = useState(false);
  const [bubbleDragStart, setBubbleDragStart] = useState({ x: 0, y: 0 });
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (card.imageData) {
      const timer = setTimeout(() => setShowImage(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShowImage(false);
    }
  }, [card.imageData]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(2, prev + delta)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (isExpanded) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleBubbleMouseDown = (e: React.MouseEvent, bubbleId: string) => {
    e.stopPropagation();
    const bubble = card.speechBubbles.find((b) => b.id === bubbleId);
    if (!bubble) return;
    setDraggingBubbleId(bubbleId);
    setBubbleDragStart({ x: e.clientX - bubble.x, y: e.clientY - bubble.y });
  };

  const handleNarrationMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!card.narration) return;
    setDraggingNarration(true);
    setBubbleDragStart({ x: e.clientX - card.narration.x, y: e.clientY - card.narration.y });
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingBubbleId) {
        const newX = Math.max(0, Math.min(450, e.clientX - bubbleDragStart.x));
        const newY = Math.max(0, Math.min(450, e.clientY - bubbleDragStart.y));
        onUpdateCard({
          speechBubbles: card.speechBubbles.map((b) =>
            b.id === draggingBubbleId ? { ...b, x: newX, y: newY } : b
          ),
        });
      }
      if (draggingNarration && card.narration) {
        const newX = Math.max(0, Math.min(450, e.clientX - bubbleDragStart.x));
        const newY = Math.max(0, Math.min(450, e.clientY - bubbleDragStart.y));
        onUpdateCard({
          narration: { ...card.narration, x: newX, y: newY },
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setDraggingBubbleId(null);
      setDraggingNarration(false);
    };

    if (draggingBubbleId || draggingNarration) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [draggingBubbleId, draggingNarration, bubbleDragStart, card.speechBubbles, card.narration, onUpdateCard]);

  const addSpeechBubble = () => {
    if (card.speechBubbles.length >= 5) return;
    const newBubble: SpeechBubble = {
      id: uuidv4(),
      text: '',
      style: 'oval',
      x: 100 + card.speechBubbles.length * 30,
      y: 100 + card.speechBubbles.length * 30,
    };
    onUpdateCard({
      speechBubbles: [...card.speechBubbles, newBubble],
    });
    setEditingBubbleId(newBubble.id);
  };

  const updateBubbleText = (bubbleId: string, text: string) => {
    if (text.length > 60) return;
    onUpdateCard({
      speechBubbles: card.speechBubbles.map((b) =>
        b.id === bubbleId ? { ...b, text } : b
      ),
    });
  };

  const updateBubbleStyle = (bubbleId: string, style: BubbleStyle['id']) => {
    onUpdateCard({
      speechBubbles: card.speechBubbles.map((b) =>
        b.id === bubbleId ? { ...b, style } : b
      ),
    });
  };

  const removeBubble = (bubbleId: string) => {
    onUpdateCard({
      speechBubbles: card.speechBubbles.filter((b) => b.id !== bubbleId),
    });
    if (editingBubbleId === bubbleId) {
      setEditingBubbleId(null);
    }
  };

  const addNarration = () => {
    if (card.narration) {
      setEditingNarration(true);
      return;
    }
    const newNarration: Narration = {
      id: uuidv4(),
      text: '',
      x: 350,
      y: 20,
    };
    onUpdateCard({ narration: newNarration });
    setEditingNarration(true);
  };

  const updateNarrationText = (text: string) => {
    if (text.length > 100) return;
    if (card.narration) {
      onUpdateCard({ narration: { ...card.narration, text } });
    }
  };

  const removeNarration = () => {
    onUpdateCard({ narration: null });
    setEditingNarration(false);
  };

  const getBubbleStyle = (style: BubbleStyle['id']): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      padding: '8px 14px',
      backgroundColor: '#ffffff',
      color: '#333333',
      fontFamily: "'Comic Neue', 'Noto Sans SC', sans-serif",
      fontSize: '14px',
      lineHeight: 1.4,
      maxWidth: '180px',
      wordBreak: 'break-word',
      cursor: 'move',
      userSelect: 'none',
      zIndex: 10,
    };

    switch (style) {
      case 'oval':
        return {
          ...base,
          borderRadius: '50%',
          border: '2px solid #333333',
          minWidth: '60px',
          textAlign: 'center',
        };
      case 'rounded':
        return {
          ...base,
          borderRadius: '12px',
          border: '2px solid #333333',
        };
      case 'shout':
        return {
          ...base,
          borderRadius: '8px',
          border: '3px solid #333333',
          fontWeight: 'bold',
          transform: 'skew(-2deg)',
        };
      case 'thought':
        return {
          ...base,
          borderRadius: '20px',
          border: '2px dashed #666666',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
        };
      default:
        return base;
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('image-container')) {
      setEditingBubbleId(null);
      setEditingNarration(false);
    }
    if (onClick && !isExpanded) {
      onClick();
    }
  };

  return (
    <div className={`image-card ${isExpanded ? 'expanded' : 'compact'}`} onClick={handleContainerClick}>
      <div
        ref={containerRef}
        className={`image-container ${showImage ? 'fade-in' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : isExpanded ? 'grab' : 'pointer' }}
      >
        {card.status === 'loading' && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-progress">{Math.round(card.progress)}%</div>
          </div>
        )}

        {card.status === 'error' && (
          <div className="error-overlay">
            <span className="error-icon">!</span>
            <p>{card.error || '生成失败'}</p>
          </div>
        )}

        {card.imageData && (
          <img
            src={card.imageData}
            alt={card.prompt}
            className="comic-image"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
            }}
            draggable={false}
          />
        )}

        {!card.imageData && card.status === 'idle' && (
          <div className="placeholder">
            <span className="placeholder-icon">🎨</span>
            <p>点击生成漫画图像</p>
          </div>
        )}

        {isExpanded &&
          card.speechBubbles.map((bubble) => (
            <div
              key={bubble.id}
              className={`speech-bubble ${draggingBubbleId === bubble.id ? 'dragging' : ''}`}
              style={{
                ...getBubbleStyle(bubble.style),
                left: bubble.x,
                top: bubble.y,
              }}
              onMouseDown={(e) => handleBubbleMouseDown(e, bubble.id)}
              onClick={(e) => {
                e.stopPropagation();
                setEditingBubbleId(bubble.id);
                setEditingNarration(false);
              }}
            >
              {bubble.text || '点击编辑...'}
              {editingBubbleId === bubble.id && (
                <div
                  className="bubble-editor"
                  onClick={(e) => e.stopPropagation()}
                >
                  <textarea
                    value={bubble.text}
                    onChange={(e) => updateBubbleText(bubble.id, e.target.value)}
                    placeholder="输入对话内容..."
                    maxLength={60}
                    autoFocus
                  />
                  <div className="bubble-controls">
                    <div className="style-selector">
                      {BUBBLE_STYLES.map((s) => (
                        <button
                          key={s.id}
                          className={`style-btn ${bubble.style === s.id ? 'active' : ''}`}
                          onClick={() => updateBubbleStyle(bubble.id, s.id)}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                    <button className="delete-btn" onClick={() => removeBubble(bubble.id)}>
                      删除
                    </button>
                  </div>
                  <span className="char-count">{bubble.text.length}/60</span>
                </div>
              )}
            </div>
          ))}

        {isExpanded && card.narration && (
          <div
            className={`narration ${draggingNarration ? 'dragging' : ''}`}
            style={{
              position: 'absolute',
              left: card.narration.x,
              top: card.narration.y,
              cursor: 'move',
              zIndex: 10,
            }}
            onMouseDown={handleNarrationMouseDown}
            onClick={(e) => {
              e.stopPropagation();
              setEditingNarration(true);
              setEditingBubbleId(null);
            }}
          >
            <span className="narration-text">
              {card.narration.text || '旁白...'}
            </span>
            {editingNarration && (
              <div
                className="narration-editor"
                onClick={(e) => e.stopPropagation()}
              >
                <textarea
                  value={card.narration.text}
                  onChange={(e) => updateNarrationText(e.target.value)}
                  placeholder="输入旁白内容..."
                  maxLength={100}
                  autoFocus
                />
                <div className="narration-controls">
                  <button className="delete-btn" onClick={removeNarration}>
                    删除
                  </button>
                </div>
                <span className="char-count">{card.narration.text.length}/100</span>
              </div>
            )}
          </div>
        )}
      </div>

      {isExpanded && card.status === 'completed' && (
        <div className="card-toolbar">
          <div className="toolbar-group">
            <button className="tool-btn" onClick={addSpeechBubble}>
              💬 添加对话
            </button>
            <button className="tool-btn" onClick={addNarration}>
              📝 添加旁白
            </button>
          </div>
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
              −
            </button>
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            <button className="zoom-btn" onClick={() => setScale((s) => Math.min(2, s + 0.1))}>
              +
            </button>
            <button
              className="reset-btn"
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
            >
              重置
            </button>
          </div>
        </div>
      )}

      <style>{`
        .image-card {
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease-out;
        }

        .image-card.expanded {
          width: 100%;
          max-width: 600px;
        }

        .image-card.compact {
          width: 240px;
          flex-shrink: 0;
          cursor: pointer;
        }

        .image-card.compact:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .image-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background: #f5f0e8;
          opacity: 0;
        }

        .image-container.fade-in {
          opacity: 1;
          transition: opacity 0.5s ease-out;
        }

        .comic-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
          transition: transform 0.1s ease-out;
        }

        .loading-overlay {
          position: absolute;
          inset: 0;
          background: rgba(245, 240, 232, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          z-index: 20;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #e0e0e0;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-progress {
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 18px;
          font-weight: 500;
          color: #667eea;
        }

        .error-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255, 200, 200, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          z-index: 20;
        }

        .error-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #e74c3c;
          color: #ffffff;
          font-size: 28px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-overlay p {
          margin: 0;
          font-family: 'Noto Sans SC', sans-serif;
          color: #c0392b;
          font-size: 14px;
        }

        .placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #999999;
        }

        .placeholder-icon {
          font-size: 48px;
        }

        .placeholder p {
          margin: 0;
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 14px;
        }

        .narration-text {
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          text-shadow: -2px -2px 0 #000000, 2px -2px 0 #000000, -2px 2px 0 #000000, 2px 2px 0 #000000,
                       -1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000;
          padding: 4px 8px;
          max-width: 200px;
          display: block;
          word-break: break-word;
        }

        .bubble-editor,
        .narration-editor {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          min-width: 200px;
          background: #ffffff;
          border: 2px solid #5B9BD5;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          z-index: 30;
        }

        .bubble-editor textarea,
        .narration-editor textarea {
          width: 100%;
          min-height: 60px;
          padding: 8px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 13px;
          resize: vertical;
        }

        .bubble-controls,
        .narration-controls {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          align-items: center;
          justify-content: space-between;
        }

        .style-selector {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .style-btn {
          padding: 4px 10px;
          border: 1px solid #cccccc;
          border-radius: 4px;
          background: #f5f5f5;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .style-btn.active {
          background: #5B9BD5;
          color: #ffffff;
          border-color: #5B9BD5;
        }

        .delete-btn {
          padding: 4px 12px;
          border: none;
          border-radius: 4px;
          background: #e74c3c;
          color: #ffffff;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .delete-btn:hover {
          background: #c0392b;
        }

        .char-count {
          display: block;
          text-align: right;
          font-size: 11px;
          color: #999999;
          margin-top: 4px;
        }

        .card-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #fafafa;
          border-top: 1px solid #e0e0e0;
          gap: 12px;
        }

        .toolbar-group {
          display: flex;
          gap: 8px;
        }

        .tool-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          background: #5B9BD5;
          color: #ffffff;
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }

        .tool-btn:hover {
          background: #4a8bc4;
          transform: translateY(-1px);
        }

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .zoom-btn {
          width: 32px;
          height: 32px;
          border: 1px solid #cccccc;
          border-radius: 4px;
          background: #ffffff;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .zoom-btn:hover {
          background: #f5f5f5;
        }

        .zoom-level {
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 13px;
          color: #666666;
          min-width: 50px;
          text-align: center;
        }

        .reset-btn {
          padding: 6px 12px;
          border: 1px solid #8FBC8F;
          border-radius: 4px;
          background: transparent;
          color: #8FBC8F;
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reset-btn:hover {
          background: #8FBC8F;
          color: #ffffff;
        }

        .speech-bubble.dragging,
        .narration.dragging {
          opacity: 0.7;
          z-index: 25;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .image-card.compact {
            width: 100%;
          }

          .card-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .toolbar-group,
          .zoom-controls {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default ImageCard;
