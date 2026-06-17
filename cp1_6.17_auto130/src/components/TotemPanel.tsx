import { useState } from 'react';
import { Totem, ELEMENT_COLORS, FUSION_COLORS, MAX_TOTEMS } from '../types';
import './TotemPanel.css';

interface TotemPanelProps {
  totems: Totem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

const TotemPanel = ({ totems, selectedId, onSelect, onReorder }: TotemPanelProps) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const getTotemColors = (totem: Totem): [string, string] => {
    if (totem.isRare) {
      return ['#9932CC', '#DDA0DD'];
    }
    const elementColors = (ELEMENT_COLORS as any)[totem.type];
    const fusionColors = (FUSION_COLORS as any)[totem.type];
    return elementColors || fusionColors || ['#888', '#aaa'];
  };

  const getTotemSymbol = (totem: Totem): string => {
    if (totem.isRare) return '✨';
    const symbols: Record<string, string> = {
      fire: '🔥',
      water: '💧',
      earth: '🌍',
      wind: '🌪️',
      steam: '♨️',
      lava: '🌋',
      smoke: '💨',
      mud: '🏜️',
      mist: '🌫️',
      sand: '🏖️',
    };
    return symbols[totem.type] || '❓';
  };

  const getExpProgress = (totem: Totem): number => {
    const expNeeded = totem.level * 50;
    return Math.min((totem.exp / expNeeded) * 100, 100);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index < totems.length) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggingIndex !== null && draggingIndex !== toIndex && toIndex < totems.length) {
      onReorder(draggingIndex, toIndex);
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleTotemClick = (totem: Totem) => {
    if (selectedId === totem.id) {
      onSelect(null);
    } else {
      onSelect(totem.id);
    }
  };

  return (
    <div className="totem-panel glass-card">
      <div className="panel-header">
        <h3>图腾背包</h3>
        <span className="totem-count">{totems.length} / {MAX_TOTEMS}</span>
      </div>

      <div className="totem-grid">
        {Array.from({ length: MAX_TOTEMS }).map((_, index) => {
          const totem = totems[index];
          const isSelected = totem && totem.id === selectedId;
          const isDragging = draggingIndex === index;
          const isDragOver = dragOverIndex === index && draggingIndex !== index;
          const colors = totem ? getTotemColors(totem) : ['transparent', 'transparent'];

          return (
            <div
              key={index}
              className={`totem-slot-wrapper ${totem ? 'has-totem' : 'empty'} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              {totem ? (
                <div
                  className="totem-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleTotemClick(totem)}
                  style={{
                    background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                  }}
                >
                  <div className="totem-card-inner">
                    <span className="totem-symbol">{getTotemSymbol(totem)}</span>
                    {totem.isRare && (
                      <div className="rare-aura">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="aura-particle" style={{ '--i': i } as React.CSSProperties} />
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="totem-level">Lv.{totem.level}</div>
                  
                  <div className="exp-bar">
                    <div
                      className="exp-fill"
                      style={{ width: `${getExpProgress(totem)}%` }}
                    />
                  </div>

                  {totem.level > 1 && (
                    <div className="level-particles">
                      {[...Array(totem.level - 1)].map((_, i) => (
                        <div key={i} className="particle-dot" />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-slot">
                  <span>+</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel-info">
        <p>点击选择图腾，拖拽排序位置</p>
        {selectedId && (
          <p className="selected-info">
            已选择：{totems.find(t => t.id === selectedId)?.type || '未知'}图腾
          </p>
        )}
      </div>
    </div>
  );
};

export default TotemPanel;
