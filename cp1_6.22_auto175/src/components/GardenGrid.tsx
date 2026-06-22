import React, { useState, useRef, useEffect } from 'react';
import { Plant, PLANT_TYPES } from '../utils/plantEngine';
import { PlantCard } from './PlantCard';

export interface GardenSlot {
  index: number;
  plant: Plant | null;
}

interface GardenGridProps {
  slots: GardenSlot[];
  onSlotClick: (index: number) => void;
  onPlantClick: (plantId: string) => void;
  onPlantMove: (fromIndex: number, toIndex: number) => void;
  onSelectPlantType?: (typeId: string, slotIndex: number) => void;
}

interface DragState {
  plantId: string;
  fromIndex: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
}

export const GardenGrid: React.FC<GardenGridProps> = ({
  slots,
  onSlotClick,
  onPlantClick,
  onPlantMove,
  onSelectPlantType
}) => {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState<number | null>(null);
  const [swapAnimating, setSwapAnimating] = useState<{ from: number; to: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragElRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (index: number, plantId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const slotEl = (e.currentTarget as HTMLElement).closest('.garden-slot');
    if (!slotEl) return;
    const rect = slotEl.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    setDrag({
      plantId,
      fromIndex: index,
      x: clientX,
      y: clientY,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    });
    document.body.style.cursor = 'grabbing';
  };

  useEffect(() => {
    if (!drag) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      setDrag(prev => prev ? { ...prev, x: clientX, y: clientY } : null);

      if (gridRef.current) {
        const gridRect = gridRef.current.getBoundingClientRect();
        const slotEls = gridRef.current.querySelectorAll<HTMLElement>('.garden-slot');
        let found: number | null = null;
        slotEls.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
            found = i;
          }
        });
        setHoverIndex(found);
      }
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      let clientX: number, clientY: number;
      if ('changedTouches' in e) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      if (gridRef.current) {
        const slotEls = gridRef.current.querySelectorAll<HTMLElement>('.garden-slot');
        let targetIndex: number | null = null;
        slotEls.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
            targetIndex = i;
          }
        });

        if (targetIndex !== null && targetIndex !== drag.fromIndex) {
          setSwapAnimating({ from: drag.fromIndex, to: targetIndex });
          setTimeout(() => {
            onPlantMove(drag.fromIndex, targetIndex!);
            setSwapAnimating(null);
          }, 300);
        }
      }

      setDrag(null);
      setHoverIndex(null);
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      document.body.style.cursor = '';
    };
  }, [drag, onPlantMove]);

  const renderSlot = (slot: GardenSlot, index: number) => {
    const isHovered = hoverIndex === index && drag && drag.fromIndex !== index;
    const isSwapFrom = swapAnimating?.from === index;
    const isSwapTo = swapAnimating?.to === index;
    const isDraggingSource = drag?.fromIndex === index;

    let swapStyle: React.CSSProperties = {};
    if (swapAnimating) {
      if (gridRef.current) {
        const slotEls = gridRef.current.querySelectorAll<HTMLElement>('.garden-slot');
        const fromEl = slotEls[swapAnimating.from];
        const toEl = slotEls[swapAnimating.to];
        if (fromEl && toEl) {
          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();
          const dx = toRect.left - fromRect.left;
          const dy = toRect.top - fromRect.top;
          if (isSwapFrom) {
            swapStyle = { transform: `translate(${dx}px, ${dy}px)`, transition: 'transform 0.3s ease' };
          } else if (isSwapTo) {
            swapStyle = { transform: `translate(${-dx}px, ${-dy}px)`, transition: 'transform 0.3s ease' };
          }
        }
      }
    }

    return (
      <div
        key={index}
        className={`garden-slot ${isHovered ? 'hovered' : ''} ${slot.plant ? 'occupied' : 'empty'}`}
        onClick={() => {
          if (drag || swapAnimating) return;
          if (slot.plant) {
            onPlantClick(slot.plant.id);
          } else {
            if (onSelectPlantType) {
              setShowPicker(index);
            } else {
              onSlotClick(index);
            }
          }
        }}
        style={swapStyle}
      >
        {slot.plant ? (
          <PlantCard
            plant={slot.plant}
            compact
            isDragging={isDraggingSource}
            onDragStart={(e) => handleDragStart(index, slot.plant!.id, e)}
          />
        ) : (
          <div className="empty-slot-content">
            <span className="plus-icon">+</span>
            <span className="empty-hint">点击种植</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="garden-grid-wrapper">
      <div className="garden-grid" ref={gridRef}>
        {slots.map((slot, index) => renderSlot(slot, index))}
      </div>

      {showPicker !== null && (
        <div className="plant-picker-overlay" onClick={() => setShowPicker(null)}>
          <div className="plant-picker" onClick={(e) => e.stopPropagation()}>
            <h3>选择植物</h3>
            <div className="picker-options">
              {PLANT_TYPES.map(pt => (
                <button
                  key={pt.id}
                  className="picker-option"
                  onClick={() => {
                    onSelectPlantType?.(pt.id, showPicker);
                    setShowPicker(null);
                  }}
                  style={{ borderColor: pt.color }}
                >
                  <span className="picker-icon">{pt.icon}</span>
                  <span className="picker-name">{pt.name}</span>
                  <span className="picker-species">{pt.species}</span>
                </button>
              ))}
            </div>
            <button className="picker-close" onClick={() => setShowPicker(null)}>取消</button>
          </div>
        </div>
      )}

      {drag && (() => {
        const plant = slots[drag.fromIndex].plant;
        if (!plant) return null;
        return (
          <div
            ref={dragElRef}
            className="drag-ghost"
            style={{
              left: drag.x - drag.offsetX,
              top: drag.y - drag.offsetY
            }}
          >
            <PlantCard plant={plant} compact style={{ opacity: 0.85 }} />
          </div>
        );
      })()}

      <style>{`
        .garden-grid-wrapper {
          position: relative;
          padding: 16px;
        }
        .garden-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
        }
        .garden-slot {
          aspect-ratio: 1 / 1;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease;
          position: relative;
          min-height: 120px;
        }
        .garden-slot.empty {
          border: 2px dashed #86efac;
          background: #ecfdf5;
        }
        .garden-slot.empty:hover {
          background: #d1fae5;
          border-color: #10b981;
        }
        .garden-slot.hovered {
          background: #bbf7d0 !important;
          border-color: #059669 !important;
          border-style: solid !important;
          transform: scale(1.03);
        }
        .empty-slot-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #10b981;
        }
        .plus-icon {
          font-size: 32px;
          font-weight: 300;
          line-height: 1;
        }
        .empty-hint {
          font-size: 12px;
          opacity: 0.8;
        }
        .drag-ghost {
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          width: 120px;
          height: 120px;
          opacity: 0.9;
          cursor: grabbing;
          filter: drop-shadow(0 8px 16px rgba(0,0,0,0.2));
        }
        .plant-picker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fade-in 0.2s ease;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .plant-picker {
          background: white;
          border-radius: 20px;
          padding: 24px;
          max-width: 420px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
          animation: scale-in 0.25s ease;
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .plant-picker h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #065f46;
          text-align: center;
        }
        .picker-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .picker-option {
          background: white;
          border: 2px solid;
          border-radius: 12px;
          padding: 16px 8px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .picker-option:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.1);
        }
        .picker-icon { font-size: 32px; }
        .picker-name { font-size: 14px; font-weight: 600; color: #1e293b; }
        .picker-species { font-size: 10px; color: #64748b; font-style: italic; }
        .picker-close {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 10px;
          background: #f1f5f9;
          color: #475569;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
          font-family: inherit;
        }
        .picker-close:hover { background: #e2e8f0; }
        @media (max-width: 768px) {
          .garden-grid {
            grid-template-columns: repeat(2, 1fr);
            max-width: 320px;
          }
          .garden-slot {
            min-height: 140px;
          }
          .picker-options { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default GardenGrid;
