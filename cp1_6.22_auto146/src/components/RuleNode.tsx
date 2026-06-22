import { useRef, useState } from 'react';
import { RuleNode as RuleNodeType } from '../types';

interface RuleNodeProps {
  node: RuleNodeType;
  isSelected: boolean;
  isAnimating?: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onDoubleClick: () => void;
  onStartConnect: (nodeId: string, anchorType: 'output') => void;
  onEndConnect: (nodeId: string, anchorType: 'input') => void;
  isConnecting: boolean;
  onDelete: () => void;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

function RuleNode({
  node,
  isSelected,
  isAnimating,
  onSelect,
  onMove,
  onDoubleClick,
  onStartConnect,
  onEndConnect,
  isConnecting,
  onDelete,
}: RuleNodeProps) {
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [hoverAnchor, setHoverAnchor] = useState<'input' | 'output' | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.anchor) return;
    e.stopPropagation();
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    };
    onSelect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = Math.max(0, moveEvent.clientX - dragOffset.current.x);
      const newY = Math.max(0, moveEvent.clientY - dragOffset.current.y);
      onMove(newX, newY);
    };

    const handleMouseUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleAnchorMouseDown = (e: React.MouseEvent, anchorType: 'output') => {
    e.stopPropagation();
    onStartConnect(node.id, anchorType);
  };

  const handleAnchorMouseUp = (e: React.MouseEvent, anchorType: 'input') => {
    e.stopPropagation();
    if (isConnecting) {
      onEndConnect(node.id, anchorType);
    }
  };

  const isCondition = node.type === 'condition';
  const bgColor = isCondition
    ? isAnimating
      ? '#065f46'
      : '#1e3a5f'
    : isAnimating
    ? '#065f46'
    : '#3b1e5f';
  const borderColor = isSelected
    ? '#38bdf8'
    : isCondition
    ? '#3b82f6'
    : '#8b5cf6';

  const iconMap: Record<string, string> = {
    temp_high: '🌡️',
    temp_low: '🌡️',
    humidity_high: '💧',
    humidity_low: '💧',
    device_on: '💡',
    motion: '🚶',
    light_on: '💡',
    light_off: '💡',
    ac_on: '❄️',
    ac_off: '❄️',
    curtain_open: '🪟',
    curtain_close: '🪟',
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        background: bgColor,
        borderRadius: 12,
        border: `2px solid ${borderColor}`,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        boxShadow: isSelected
          ? '0 0 16px rgba(56, 189, 248, 0.4), rgba(0,0,0,0.3) 0px 4px 12px'
          : 'rgba(0,0,0,0.3) 0px 4px 12px',
        transition: isAnimating ? 'background 300ms' : 'none',
        zIndex: isSelected ? 10 : 1,
      }}
    >
      {node.type === 'condition' && (
        <div
          data-anchor="input"
          onMouseUp={(e) => handleAnchorMouseUp(e, 'input')}
          onMouseEnter={() => setHoverAnchor('input')}
          onMouseLeave={() => setHoverAnchor(null)}
          style={{
            position: 'absolute',
            left: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: hoverAnchor === 'input' ? '#38bdf8' : '#64748b',
            border: '2px solid #1e293b',
            cursor: 'crosshair',
            transition: 'background 200ms',
            zIndex: 20,
          }}
        />
      )}

      {node.type === 'action' && (
        <div
          data-anchor="output"
          onMouseDown={(e) => handleAnchorMouseDown(e, 'output')}
          onMouseEnter={() => setHoverAnchor('output')}
          onMouseLeave={() => setHoverAnchor(null)}
          style={{
            position: 'absolute',
            right: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: hoverAnchor === 'output' ? '#38bdf8' : '#64748b',
            border: '2px solid #1e293b',
            cursor: 'crosshair',
            transition: 'background 200ms',
            zIndex: 20,
          }}
        />
      )}

      {node.type === 'condition' && (
        <div
          data-anchor="output"
          onMouseDown={(e) => handleAnchorMouseDown(e, 'output')}
          onMouseEnter={() => setHoverAnchor('output')}
          onMouseLeave={() => setHoverAnchor(null)}
          style={{
            position: 'absolute',
            right: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: hoverAnchor === 'output' ? '#38bdf8' : '#64748b',
            border: '2px solid #1e293b',
            cursor: 'crosshair',
            transition: 'background 200ms',
            zIndex: 20,
          }}
        />
      )}

      <div
        style={{
          padding: '10px 14px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{iconMap[node.subtype] || '⚙️'}</span>
          <div
            style={{
              fontSize: 11,
              color: isCondition ? '#93c5fd' : '#c4b5fd',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {isCondition ? '条件' : '动作'}
          </div>
          {isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('确定删除此节点？')) onDelete();
              }}
              style={{
                marginLeft: 'auto',
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 200ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ef4444')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)')
              }
            >
              ×
            </button>
          )}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {node.label}
        </div>
      </div>
    </div>
  );
}

export { NODE_WIDTH, NODE_HEIGHT };
export default RuleNode;
