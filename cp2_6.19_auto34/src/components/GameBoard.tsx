import { useState, useEffect, useCallback, useRef } from 'react';
import type { WordData, DraggablePart } from '../types';
import { shuffleArray } from '../data/words';
import { v4 as uuidv4 } from 'uuid';

/**
 * GameBoard 核心游戏面板组件
 *
 * 调用关系与数据流向：
 *   ← 接收 App.tsx 传入的 props：
 *     - wordData: 当前题目数据（含 word 完整词语 和 parts 拆分部件）
 *     - onCorrect: 答对回调，通知 App.tsx 更新得分和进度
 *     - disabled: 是否禁用交互（加载下一题期间为 true）
 *
 *   → 向 App.tsx 输出：
 *     - onCorrect() 调用：用户拼对词语后触发，App 据此更新 score、correctCount、roundProgress
 *
 * 内部状态：
 *   - availableParts: 源区域中可拖拽的部件列表（乱序）
 *   - placedParts: 已放入目标槽位的部件列表（按放入顺序）
 *   - slotStatus: 槽位当前状态 empty/filling/correct/wrong
 *   - isDragging + dragPart + dragPosition: 拖拽状态与位置（用于半透明阴影跟随）
 *   - hoveringSlot: 鼠标/手指是否悬停在目标槽位上方
 */

interface GameBoardProps {
  wordData: WordData;
  onCorrect: () => void;
  disabled?: boolean;
}

function GameBoard({ wordData, onCorrect, disabled = false }: GameBoardProps) {
  const [availableParts, setAvailableParts] = useState<DraggablePart[]>([]);
  const [placedParts, setPlacedParts] = useState<DraggablePart[]>([]);
  const [slotStatus, setSlotStatus] = useState<'empty' | 'filling' | 'correct' | 'wrong'>('empty');
  const [isDragging, setIsDragging] = useState(false);
  const [dragPart, setDragPart] = useState<DraggablePart | null>(null);
  const [hoveringSlot, setHoveringSlot] = useState(false);

  const slotRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parts: DraggablePart[] = wordData.parts.map((char, index) => ({
      id: uuidv4(),
      char,
      sourceIndex: index
    }));
    setAvailableParts(shuffleArray(parts));
    setPlacedParts([]);
    setSlotStatus('empty');
  }, [wordData]);

  const checkAnswer = useCallback(
    (placed: DraggablePart[]) => {
      const placedWord = placed.map((p) => p.char).join('');
      if (placedWord === wordData.word) {
        setSlotStatus('correct');
        setTimeout(() => {
          onCorrect();
        }, 500);
        return true;
      }
      return false;
    },
    [wordData.word, onCorrect]
  );

  const handleSlotDrop = useCallback(
    (part: DraggablePart) => {
      if (disabled || slotStatus === 'correct') return;

      const newPlaced = [...placedParts, part];
      setPlacedParts(newPlaced);
      setAvailableParts((prev) => prev.filter((p) => p.id !== part.id));
      setSlotStatus('filling');

      if (newPlaced.length === wordData.word.length) {
        const isCorrect = checkAnswer(newPlaced);
        if (!isCorrect) {
          setSlotStatus('wrong');
          setTimeout(() => {
            setAvailableParts((prev) => shuffleArray([...prev, ...newPlaced]));
            setPlacedParts([]);
            setSlotStatus('empty');
          }, 1500);
        }
      }
    },
    [disabled, slotStatus, placedParts, wordData.word.length, checkAnswer]
  );

  const createGhost = useCallback((char: string, startX: number, startY: number) => {
    if (ghostRef.current) {
      ghostRef.current.remove();
    }
    const ghost = document.createElement('div');
    ghost.textContent = char;
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${startX - 35}px`,
      top: `${startY - 35}px`,
      width: '70px',
      height: '70px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#F5A623',
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      border: '2px solid #F5A623',
      pointerEvents: 'none',
      zIndex: '9999',
      opacity: '0.9',
      transition: 'none',
      touchAction: 'none'
    });
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
  }, []);

  const updateGhostPosition = useCallback((x: number, y: number) => {
    if (ghostRef.current) {
      ghostRef.current.style.left = `${x - 35}px`;
      ghostRef.current.style.top = `${y - 35}px`;
    }
  }, []);

  const removeGhost = useCallback(() => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
  }, []);

  const isOverSlot = useCallback((clientX: number, clientY: number): boolean => {
    if (!slotRef.current) return false;
    const rect = slotRef.current.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  }, []);

  // ========== 鼠标拖拽 (HTML5 Drag and Drop) ==========

  const handleDragStart = (e: React.DragEvent, part: DraggablePart) => {
    if (disabled || slotStatus === 'correct') {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    setDragPart(part);

    const dragImage = document.createElement('div');
    dragImage.textContent = part.char;
    Object.assign(dragImage.style, {
      width: '70px',
      height: '70px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#F5A623',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      border: '2px solid #F5A623',
      position: 'absolute',
      top: '-9999px',
      left: '-9999px'
    });
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 35, 35);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', part.id);

    setTimeout(() => {
      dragImage.remove();
    }, 0);

    createGhost(part.char, e.clientX, e.clientY);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    updateGhostPosition(e.clientX, e.clientY);
    setHoveringSlot(isOverSlot(e.clientX, e.clientY));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragPart(null);
    setHoveringSlot(false);
    removeGhost();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveringSlot(true);
  };

  const handleDragLeave = () => {
    setHoveringSlot(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHoveringSlot(false);
    if (dragPart) {
      handleSlotDrop(dragPart);
    }
    setIsDragging(false);
    setDragPart(null);
    removeGhost();
  };

  // ========== 触摸拖拽 (Touch Events) ==========

  const handleTouchStart = (e: React.TouchEvent, part: DraggablePart) => {
    if (disabled || slotStatus === 'correct') return;
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragPart(part);
    createGhost(part.char, touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateGhostPosition(touch.clientX, touch.clientY);
    setHoveringSlot(isOverSlot(touch.clientX, touch.clientY));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || !dragPart) {
      setIsDragging(false);
      setDragPart(null);
      removeGhost();
      return;
    }
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (isOverSlot(touch.clientX, touch.clientY)) {
      handleSlotDrop(dragPart);
    }
    setIsDragging(false);
    setDragPart(null);
    setHoveringSlot(false);
    removeGhost();
  };

  const getSlotBorderStyle = () => {
    switch (slotStatus) {
      case 'correct':
        return {
          border: '3px solid #4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)'
        };
      case 'wrong':
        return {
          border: '3px solid #F44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)'
        };
      default:
        return {
          border: hoveringSlot
            ? '3px dashed #F5A623'
            : '2px dashed #ccc',
          backgroundColor: hoveringSlot
            ? 'rgba(245, 166, 35, 0.05)'
            : '#fafafa'
        };
    }
  };

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px'
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '8px 24px',
          backgroundColor: 'rgba(245, 166, 35, 0.1)',
          borderRadius: '20px',
          color: '#F5A623',
          fontWeight: 'bold',
          fontSize: '14px'
        }}
      >
        请拖动汉字部件，组成正确的词语 ✨
      </div>

      <div className="game-layout">
        <div className="source-area">
          <div
            style={{
              fontSize: '13px',
              color: '#888',
              marginBottom: '12px',
              fontWeight: '500',
              paddingLeft: '4px'
            }}
          >
            汉字部件 ({availableParts.length})
          </div>
          <div className="parts-grid">
            {availableParts.map((part) => (
              <PartCard
                key={part.id}
                part={part}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                isBeingDragged={dragPart?.id === part.id}
                disabled={disabled || slotStatus === 'correct'}
              />
            ))}
          </div>
        </div>

        <div className="target-area">
          <div
            style={{
              fontSize: '13px',
              color: '#888',
              marginBottom: '12px',
              fontWeight: '500',
              paddingLeft: '4px'
            }}
          >
            拼词槽位 ({placedParts.length}/{wordData.word.length})
          </div>
          <div
            ref={slotRef}
            className={
              slotStatus === 'correct'
                ? 'success-pulse'
                : slotStatus === 'wrong'
                ? 'shake'
                : ''
            }
            style={{
              minHeight: '120px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: '16px',
              gap: '12px',
              flexWrap: 'wrap',
              transition: 'all 0.2s ease',
              ...getSlotBorderStyle()
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {placedParts.length === 0 ? (
              <div
                style={{
                  color: '#aaa',
                  fontSize: '14px',
                  textAlign: 'center',
                  width: '100%'
                }}
              >
                将汉字部件拖到这里 👇
              </div>
            ) : (
              placedParts.map((part, idx) => (
                <PlacedPart
                  key={`${part.id}-${idx}`}
                  char={part.char}
                  status={slotStatus === 'correct' ? 'correct' : slotStatus === 'wrong' ? 'wrong' : 'normal'}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#666',
          fontSize: '13px',
          padding: '8px 16px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <span>💡 提示：这是一个</span>
        <span
          style={{
            fontWeight: 'bold',
            color: '#F5A623'
          }}
        >
          {wordData.word.length}
        </span>
        <span>字词语</span>
      </div>
    </div>
  );
}

interface PartCardProps {
  part: DraggablePart;
  onDragStart: (e: React.DragEvent, part: DraggablePart) => void;
  onDrag: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onTouchStart: (e: React.TouchEvent, part: DraggablePart) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  isBeingDragged: boolean;
  disabled: boolean;
}

function PartCard({
  part,
  onDragStart,
  onDrag,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isBeingDragged,
  disabled
}: PartCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => onDragStart(e, part)}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onTouchStart={(e) => onTouchStart(e, part)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        aspectRatio: '1',
        backgroundColor: '#fff',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#333',
        cursor: disabled ? 'not-allowed' : 'grab',
        userSelect: 'none',
        boxShadow: hovered
          ? '0 6px 16px rgba(0,0,0,0.15)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        border: hovered ? '2px solid #F5A623' : '2px solid transparent',
        transform: hovered && !disabled ? 'scale(1.08)' : 'scale(1)',
        opacity: isBeingDragged ? 0.4 : 1,
        transition: 'all 0.15s ease',
        touchAction: 'none'
      }}
    >
      {part.char}
    </div>
  );
}

function PlacedPart({
  char,
  status
}: {
  char: string;
  status: 'normal' | 'correct' | 'wrong';
}) {
  const colorMap = {
    normal: { bg: '#fff', color: '#333', border: '2px solid #F5A623' },
    correct: { bg: '#E8F5E9', color: '#4CAF50', border: '2px solid #4CAF50' },
    wrong: { bg: '#FFEBEE', color: '#F44336', border: '2px solid #F44336' }
  };

  return (
    <div
      style={{
        width: '64px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        fontWeight: 'bold',
        borderRadius: '8px',
        backgroundColor: colorMap[status].bg,
        color: colorMap[status].color,
        border: colorMap[status].border,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        flexShrink: 0,
        transition: 'all 0.2s ease'
      }}
    >
      {char}
    </div>
  );
}

export default GameBoard;
