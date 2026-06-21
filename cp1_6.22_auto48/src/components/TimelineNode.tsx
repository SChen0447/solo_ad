import React, { memo, useRef, useEffect, useState } from 'react';
import { StoryNode } from '@/types';
import { useInViewAnimation } from '@/utils/animation';

interface TimelineNodeProps {
  node: StoryNode;
  isSelected: boolean;
  onClick: () => void;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
}

const TimelineNode: React.FC<TimelineNodeProps> = memo(
  ({ node, isSelected, onClick, onDragStart }) => {
    const nodeRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
      if (nodeRef.current) {
        return useInViewAnimation(nodeRef.current, () => setIsVisible(true));
      }
    }, [node.id]);

    const handleMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDragStart(e, node.id);
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick();
    };

    return (
      <div
        ref={nodeRef}
        className={`timeline-node ${isSelected ? 'selected' : ''} ${
          isVisible ? 'visible' : ''
        }`}
        style={{
          left: node.positionX - 16,
          top: node.positionY - 16,
          backgroundColor: node.color,
        }}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="timeline-node__inner"></div>
        {showTooltip && (
          <div className="timeline-tooltip">
            <div className="timeline-tooltip__title">{node.title}</div>
            <div className="timeline-tooltip__date">{node.date}</div>
          </div>
        )}
      </div>
    );
  }
);

TimelineNode.displayName = 'TimelineNode';

export default TimelineNode;
