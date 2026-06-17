import React, { useState, useRef } from 'react';
import { Flower, BouquetFlower } from '../../types';
import { useStore } from '../store/Store';

const GRID_SIZE = 10;

const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

const generateInstanceId = () => `flower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface EditorFlowerProps {
  flower: BouquetFlower;
  onSelect: (flower: BouquetFlower) => void;
  onDelete: (instanceId: string) => void;
  onTransform: (instanceId: string, rotation: number, scale: number) => void;
  isSelected: boolean;
}

const EditorFlower: React.FC<EditorFlowerProps> = ({ flower, onSelect, onDelete, onTransform, isSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const { dispatch } = useStore();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(flower);
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - flower.position.x,
      y: e.clientY - flower.position.y,
    };

    const timer = window.setTimeout(() => {
      setShowInfo(true);
    }, 800);
    setLongPressTimer(timer);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const editor = document.querySelector('.bouquet-editor');
      if (editor) {
        const rect = editor.getBoundingClientRect();
        const newX = snapToGrid(e.clientX - rect.left - dragOffset.current.x + rect.left);
        const newY = snapToGrid(e.clientY - rect.top - dragOffset.current.y + rect.top);
        dispatch({
          type: 'UPDATE_FLOWER_POSITION',
          payload: {
            instanceId: flower.instanceId,
            position: { x: Math.max(20, Math.min(newX, 580)), y: Math.max(20, Math.min(newY, 460)) },
          },
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(flower.instanceId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newScale = Math.max(0.5, Math.min(2, flower.scale - e.deltaY * 0.002));
    onTransform(flower.instanceId, flower.rotation, newScale);
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newRotation = (flower.rotation + 45) % 360;
    onTransform(flower.instanceId, newRotation, flower.scale);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, flower]);

  return (
    <div
      className={`editor-flower ${isSelected ? 'selected' : ''}`}
      style={{
        left: flower.position.x,
        top: flower.position.y,
        transform: `rotate(${flower.rotation}deg) scale(${flower.scale})`,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onClick={() => {}}
    >
      <div className="flower-icon" style={{ backgroundColor: flower.color + '40' }}>
        {flower.image}
      </div>
      {isSelected && (
        <div className="flower-controls">
          <button className="rotate-btn" onClick={handleRotate} title="旋转">↻</button>
        </div>
      )}
      {showInfo && (
        <div className="flower-tooltip" onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}>
          <div className="tooltip-name">{flower.name}</div>
          <div className="tooltip-price">¥{flower.price}/枝</div>
          <div className="tooltip-desc">{flower.description}</div>
        </div>
      )}
    </div>
  );
};

const BouquetEditor: React.FC = () => {
  const { state, dispatch } = useStore();
  const [selectedFlowerId, setSelectedFlowerId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const flowerData = e.dataTransfer.getData('application/json');
      if (flowerData) {
        const flower: Flower = JSON.parse(flowerData);
        const existingStock = state.flowers.find(f => f.id === flower.id)?.stock || 0;
        if (existingStock <= 0) return;

        if (editorRef.current) {
          const rect = editorRef.current.getBoundingClientRect();
          const x = snapToGrid(e.clientX - rect.left - 30);
          const y = snapToGrid(e.clientY - rect.top - 30);

          const bouquetFlower: BouquetFlower = {
            ...flower,
            instanceId: generateInstanceId(),
            position: { x: Math.max(20, Math.min(x, 580)), y: Math.max(20, Math.min(y, 460)) },
            rotation: Math.random() * 30 - 15,
            scale: 1,
          };

          dispatch({ type: 'ADD_FLOWER_TO_BOUQUET', payload: bouquetFlower });
          dispatch({ type: 'UPDATE_FLOWER_STOCK', payload: { flowerId: flower.id, stock: existingStock - 1 } });
        }
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const handleDeleteFlower = (instanceId: string) => {
    const flower = state.bouquet.find(f => f.instanceId === instanceId);
    if (flower) {
      const existingStock = state.flowers.find(f => f.id === flower.id)?.stock || 0;
      dispatch({ type: 'UPDATE_FLOWER_STOCK', payload: { flowerId: flower.id, stock: existingStock + 1 } });
    }
    dispatch({ type: 'REMOVE_FLOWER_FROM_BOUQUET', payload: instanceId });
    setSelectedFlowerId(null);
  };

  const handleTransform = (instanceId: string, rotation: number, scale: number) => {
    dispatch({ type: 'UPDATE_FLOWER_TRANSFORM', payload: { instanceId, rotation, scale } });
  };

  const handleClearAll = () => {
    state.bouquet.forEach(flower => {
      const existingStock = state.flowers.find(f => f.id === flower.id)?.stock || 0;
      dispatch({ type: 'UPDATE_FLOWER_STOCK', payload: { flowerId: flower.id, stock: existingStock + 1 } });
    });
    dispatch({ type: 'CLEAR_BOUQUET' });
    setSelectedFlowerId(null);
  };

  const handleCheckout = () => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'checkout' });
  };

  const totalPrice = state.bouquet.reduce((sum, f) => sum + f.price, 0);

  return (
    <div className="bouquet-editor-container">
      <div className="editor-header">
        <h2>花束编辑区</h2>
        <div className="editor-actions">
          <span className="flower-count">已选 {state.bouquet.length} 枝花材</span>
          <span className="total-price">¥{totalPrice}</span>
          {state.bouquet.length > 0 && (
            <>
              <button className="clear-btn" onClick={handleClearAll}>清空</button>
              <button className="checkout-btn" onClick={handleCheckout}>去下单</button>
            </>
          )}
        </div>
      </div>

      <div
        ref={editorRef}
        className={`bouquet-editor ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => setSelectedFlowerId(null)}
      >
        {state.bouquet.length === 0 && !isDragOver && (
          <div className="empty-editor-hint">
            <div className="hint-icon">💐</div>
            <div className="hint-text">从左侧拖拽花材到此处开始搭配</div>
            <div className="hint-subtext">双击花材可删除 · 滚轮缩放 · 点击旋转按钮调整角度</div>
          </div>
        )}
        {isDragOver && (
          <div className="drop-hint">
            <div className="drop-icon">✨</div>
            <div className="drop-text">释放鼠标添加花材</div>
          </div>
        )}
        {state.bouquet.map(flower => (
          <EditorFlower
            key={flower.instanceId}
            flower={flower}
            onSelect={(f) => setSelectedFlowerId(f.instanceId)}
            onDelete={handleDeleteFlower}
            onTransform={handleTransform}
            isSelected={selectedFlowerId === flower.instanceId}
          />
        ))}
      </div>
    </div>
  );
};

export default BouquetEditor;
