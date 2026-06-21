import React, { useRef, useState, useCallback } from 'react';
import { GraphNode, NODE_WIDTH, NODE_HEIGHT } from '../types';
import { getNodeTagColor } from '../utils/conflictDetector';

interface NodeCardProps {
  node: GraphNode;
  onDragStart: (nodeId: string) => void;
  onDrag: (nodeId: string, x: number, y: number) => void;
  onDragEnd: (nodeId: string) => void;
  onLinkDragStart: (nodeId: string, x: number, y: number) => void;
  onLinkDragEnd: (targetNodeId?: string) => void;
  onClick: () => void;
  isConnecting: boolean;
}

const NodeCard: React.FC<NodeCardProps> = ({
  node,
  onDragStart,
  onDrag,
  onDragEnd,
  onLinkDragStart,
  onLinkDragEnd,
  onClick,
  isConnecting,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLinkDragging, setIsLinkDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const tagColor = getNodeTagColor(node.title, node.tags);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.connect-handle')) return;

    e.stopPropagation();
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setIsDragging(true);
    onDragStart(node.id);

    const handleMouseMove = (e: MouseEvent) => {
      const container = cardRef.current?.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - dragOffsetRef.current.x + NODE_WIDTH / 2;
      const newY = e.clientY - containerRect.top - dragOffsetRef.current.y + NODE_HEIGHT / 2;
      onDrag(node.id, newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd(node.id);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [node.id, onDragStart, onDrag, onDragEnd]);

  const handleConnectMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = cardRef.current?.getBoundingClientRect();
    const container = cardRef.current?.parentElement;
    if (!rect || !container) return;

    const containerRect = container.getBoundingClientRect();

    const startX = rect.right - containerRect.left;
    const startY = rect.top + rect.height / 2 - containerRect.top;

    setIsLinkDragging(true);
    onLinkDragStart(node.id, startX, startY);

    const handleMouseMove = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const targetNode = target?.closest('[data-node-id]');
      if (targetNode) {
        (targetNode as HTMLElement).style.boxShadow = '0 0 0 3px #3182ce';
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsLinkDragging(false);
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const targetNode = target?.closest('[data-node-id]');
      if (targetNode) {
        const targetId = (targetNode as HTMLElement).dataset.nodeId;
        if (targetId && targetId !== node.id) {
          onLinkDragEnd(targetId);
        }
        (targetNode as HTMLElement).style.boxShadow = '';
      } else {
        onLinkDragEnd();
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [node.id, onLinkDragStart, onLinkDragEnd]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging && !isLinkDragging) {
      onClick();
    }
  }, [isDragging, isLinkDragging, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (isConnecting && cardRef.current) {
      cardRef.current.style.boxShadow = '0 0 0 3px #3182ce';
    }
  }, [isConnecting]);

  const handleMouseLeave = useCallback(() => {
    if (cardRef.current && !isLinkDragging) {
      cardRef.current.style.boxShadow = '';
    }
  }, [isLinkDragging]);

  return (
    <div
      ref={cardRef}
      data-node-id={node.id}
      className="node-card"
      onMouseDown={handleMouseDown}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'absolute',
        left: node.x - NODE_WIDTH / 2,
        top: node.y - NODE_HEIGHT / 2,
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: '10px 12px',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        userSelect: 'none',
        borderTop: `4px solid ${tagColor}`,
        zIndex: isDragging ? 100 : 1,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 8,
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: tagColor,
        }}
      />

      <div
        style={{
          color: '#2d3748',
          fontSize: 13,
          fontWeight: 'bold',
          marginBottom: 4,
          marginTop: 4,
          paddingLeft: 16,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={node.title}
      >
        {node.title}
      </div>

      <div
        style={{
          color: '#4a5568',
          fontSize: 11,
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: 6,
        }}
        title={node.description}
      >
        {node.description}
      </div>

      {node.tags && node.tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
          }}
        >
          {node.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 9,
                padding: '1px 6px',
                backgroundColor: tagColor,
                color: '#fff',
                borderRadius: 8,
                opacity: 0.8,
              }}
            >
              {tag}
            </span>
          ))}
          {node.tags.length > 2 && (
            <span
              style={{
                fontSize: 9,
                padding: '1px 4px',
                color: '#718096',
              }}
            >
              +{node.tags.length - 2}
            </span>
          )}
        </div>
      )}

      <div
        className="connect-handle"
        onMouseDown={handleConnectMouseDown}
        style={{
          position: 'absolute',
          right: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: '#3182ce',
          border: '2px solid #fff',
          cursor: 'crosshair',
          opacity: 0,
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '1';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1.2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = '0';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1)';
        }}
      >
        +
      </div>

      <style>{`
        .node-card:hover .connect-handle {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default NodeCard;
