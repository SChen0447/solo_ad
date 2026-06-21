import React, { useState, useRef } from 'react';
import type { GameElement } from '../types';

interface LayerPanelProps {
  elements: GameElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onAdd: (type: GameElement['type']) => void;
  onRemove: (id: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  elements,
  selectedId,
  onSelect,
  onReorder,
  onAdd,
  onRemove
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragOffsetRef = useRef<number>(0);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const ids = elements.map((el) => el.id);
    const fromIdx = ids.indexOf(draggingId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, draggingId);
    onReorder(newIds);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const getTypeIcon = (type: GameElement['type']) => {
    switch (type) {
      case 'rect':
        return '▭';
      case 'circle':
        return '○';
      case 'text':
        return 'T';
      default:
        return '·';
    }
  };

  return (
    <div className="layer-panel">
      <div className="panel-header">
        <span>图层</span>
        <div className="add-buttons">
          <button title="添加矩形" onClick={() => onAdd('rect')}>
            ▭
          </button>
          <button title="添加圆形" onClick={() => onAdd('circle')}>
            ○
          </button>
          <button title="添加文字" onClick={() => onAdd('text')}>
            T
          </button>
        </div>
      </div>
      <div className="layer-list">
        {[...elements].reverse().map((el) => (
          <div
            key={el.id}
            className={`layer-item ${selectedId === el.id ? 'selected' : ''} ${draggingId === el.id ? 'dragging' : ''} ${dragOverId === el.id ? 'drag-over' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, el.id)}
            onDragOver={(e) => handleDragOver(e, el.id)}
            onDrop={(e) => handleDrop(e, el.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(el.id)}
          >
            <span className="layer-icon">{getTypeIcon(el.type)}</span>
            <span className="layer-name" title={el.name}>
              {el.name}
            </span>
            <button
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(el.id);
              }}
              title="删除"
            >
              ×
            </button>
          </div>
        ))}
        {elements.length === 0 && (
          <div className="empty-hint">暂无元素，点击上方按钮添加</div>
        )}
      </div>
    </div>
  );
};
