import React, { useRef, useCallback } from 'react';
import { getFurnitureList } from '../modules/roomConfig';
import { useDrag } from '../hooks/useDragDrop';
import type { DragData, FurnitureItem } from '../types';

interface FurniturePanelProps {
  isMobileExpanded: boolean;
  onToggleMobile: () => void;
}

const FurnitureCard: React.FC<{
  furniture: Omit<FurnitureItem, 'id' | 'x' | 'y'>;
}> = ({ furniture }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const dragData: DragData = {
    type: 'furniture',
    furniture,
  };

  useDrag(cardRef as React.RefObject<HTMLElement>, dragData);

  return (
    <div
      ref={cardRef}
      draggable
      data-drag={JSON.stringify(dragData)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e5e5e5',
        cursor: 'grab',
        transition: 'all 0.2s ease',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.05)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'brightness(1)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onTouchStart={(e) => {
        const target = e.currentTarget;
        const rect = target.getBoundingClientRect();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true,
        });
        target.dispatchEvent(mouseEvent);
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          backgroundColor: furniture.color,
          borderRadius: '2px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        <span style={{ fontSize: '18px', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
          {furniture.type === 'sofa' && '🛋'}
          {furniture.type === 'coffeeTable' && '☕'}
          {furniture.type === 'bookshelf' && '📚'}
          {furniture.type === 'nightstand' && '🗄'}
          {furniture.type === 'floorLamp' && '💡'}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {furniture.name}
        </div>
        <div style={{ fontSize: '11px', color: '#888' }}>
          {furniture.width} × {furniture.height} cm
        </div>
      </div>
      <div
        style={{
          fontSize: '16px',
          color: '#bbb',
          flexShrink: 0,
        }}
      >
        ⋮⋮
      </div>
    </div>
  );
};

export const FurniturePanel: React.FC<FurniturePanelProps> = ({
  isMobileExpanded,
  onToggleMobile,
}) => {
  const furnitureList = getFurnitureList();

  return (
    <>
      <style>{`
        @media (max-width: 900px) {
          .furniture-panel-desktop { display: none !important; }
          .furniture-panel-mobile { display: flex !important; }
        }
        @media (min-width: 901px) {
          .furniture-panel-mobile { display: none !important; }
        }
      `}</style>

      <div
        className="furniture-panel-desktop"
        style={{
          width: '280px',
          flexShrink: 0,
          backgroundColor: '#fafafa',
          borderRadius: '12px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 110px)',
          maxHeight: '100%',
          overflow: 'hidden',
          border: '1px solid #e5e5e5',
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#333',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '10px',
            borderBottom: '1px solid #e5e5e5',
          }}
        >
          <span>🏠</span>
          <span>家具库</span>
        </div>
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingRight: '4px',
          }}
        >
          {furnitureList.map((f, idx) => (
            <FurnitureCard key={idx} furniture={f} />
          ))}
        </div>
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            backgroundColor: '#f0ebe3',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#6b5540',
            lineHeight: '1.5',
          }}
        >
          💡 提示：将家具拖拽到房间内，靠近墙壁会自动吸附，靠近其他家具会显示对齐辅助线
        </div>
      </div>

      <div
        className="furniture-panel-mobile"
        style={{
          display: 'none',
          position: 'fixed',
          bottom: isMobileExpanded ? '70px' : '0',
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
          zIndex: 200,
          maxHeight: isMobileExpanded ? '60vh' : '60px',
          flexDirection: 'column',
          transition: 'max-height 0.3s ease, bottom 0.3s ease',
          overflow: 'hidden',
        }}
      >
        <div
          onClick={onToggleMobile}
          style={{
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderBottom: '1px solid #e5e5e5',
            flexShrink: 0,
            gap: '8px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#333',
          }}
        >
          <span>🏠</span>
          <span>家具库</span>
          <span style={{ transform: isMobileExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
            ▼
          </span>
        </div>
        {isMobileExpanded && (
          <div
            style={{
              padding: '12px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {furnitureList.map((f, idx) => (
              <FurnitureCard key={idx} furniture={f} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
